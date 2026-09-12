import { copyFile, mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { attachSourceIfMissing } from "../intelligence/openSource";
import { effectiveScores } from "../intelligence/scores";
import { normalizeStage } from "../intelligence/types";
import { headerScores } from "../intelligence/viewStory";
import { resolveExisting } from "./files";
import { dirs } from "./paths";
import { assertInsideDeal } from "./sandbox";
import type { Deal, DealSummary } from "./types";

function dealPath(id: string) {
  return path.join(dirs().data, id, "deal.json");
}

export function summarize(deal: Deal): DealSummary {
  const flagCounts = { contradiction: 0, unsupported: 0, missing: 0 };
  for (const flag of deal.flags) flagCounts[flag.severity] += 1;
  const intel = deal.intelligence;
  const scores = intel ? effectiveScores(intel) : undefined;
  const header = intel ? headerScores(intel, deal.flags) : undefined;
  const pick = (key: string) => header?.find((row) => row.key === key)?.value;
  return {
    id: deal.id,
    name: deal.name,
    company: deal.company,
    status: deal.status,
    createdAt: deal.createdAt,
    updatedAt: deal.updatedAt,
    riskScore: scores?.risk ?? deal.riskScore,
    flagCounts,
    docCount: deal.docs.length,
    error: deal.error,
    deckFilename: deal.deckFilename,
    stage: intel ? normalizeStage(intel.stage) : undefined,
    thesisException: (intel?.thesis.exceptions.length ?? 0) > 0,
    thesisFit: pick("thesis") ?? scores?.thesisFit,
    opportunityQuality: pick("opportunity") ?? scores?.opportunityQuality,
    convictionScore: pick("conviction"),
    diligenceScore: pick("diligence"),
    uncertainty: scores?.uncertainty,
    evidenceConfidence: scores?.evidenceConfidence,
    valuationAttractiveness: scores?.valuationAttractiveness,
    investmentConviction: scores?.investmentConviction,
    nextAction: waitingLabel(intel) ?? intel?.nextAction.title,
    lastActivity: intel?.timeline[intel.timeline.length - 1]?.at ?? deal.updatedAt,
    pendingGate: intel?.pendingGate,
    live: deal.id === "northstar-live",
  };
}

function waitingLabel(intel: Deal["intelligence"]): string | undefined {
  if (!intel?.pendingGate) return undefined;
  if (intel.pendingGate.id === "founder") return "Waiting on the founder";
  return "Waiting on you";
}

export async function saveDeal(deal: Deal): Promise<void> {
  const folder = path.join(dirs().data, deal.id);
  await mkdir(folder, { recursive: true });
  const decks = deal.docs.filter((doc) => (doc.role === "deck" || doc.kind === "deck") && /\.pdf$/i.test(doc.filename));
  const primary =
    decks.find((doc) => doc.filename === deal.deckFilename) ?? decks[0];
  if (primary) {
    const src = resolveExisting(primary.path, primary.filename);
    if (src) {
      if (deal.sandbox) assertInsideDeal(deal.id, src);
      await copyFile(src, path.join(folder, "deck.pdf"));
      deal.deckFilename = primary.filename;
    }
  }
  const slim = {
    ...deal,
    docs: deal.docs.map((d) => ({ ...d, markdown: d.markdown.slice(0, 20000) })),
  };
  await writeFile(dealPath(deal.id), JSON.stringify(slim, null, 2));
  const out = path.join(dirs().outbox, deal.id);
  await mkdir(out, { recursive: true });
  await writeFile(path.join(out, "deal.json"), JSON.stringify(summarize(deal), null, 2));
  if (deal.memo) {
    await writeFile(path.join(out, "memo.md"), deal.memo.bodyMarkdown);
  }
  await writeFile(path.join(out, "flags.json"), JSON.stringify(deal.flags, null, 2));
}

export async function loadDeal(id: string): Promise<Deal | null> {
  try {
    const raw = await readFile(dealPath(id), "utf8");
    const deal = JSON.parse(raw) as Deal;
    if (deal.intelligence) deal.intelligence.stage = normalizeStage(deal.intelligence.stage);
    return deal;
  } catch {
    return null;
  }
}

export async function listDeals(): Promise<DealSummary[]> {
  await mkdir(dirs().data, { recursive: true });
  const entries = await readdir(dirs().data, { withFileTypes: true });
  const loaded = await Promise.all(
    entries.filter((entry) => entry.isDirectory()).map((entry) => loadDeal(entry.name)),
  );
  const deals = loaded.filter((deal): deal is Deal => deal !== null);
  for (const deal of deals) {
    if (await attachSourceIfMissing(deal)) await saveDeal(deal);
  }
  return deals.map(summarize).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
