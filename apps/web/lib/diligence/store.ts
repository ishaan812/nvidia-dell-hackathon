import { copyFile, mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { effectiveScores } from "../intelligence/scores";
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
    stage: intel?.stage,
    thesisException: (intel?.thesis.exceptions.length ?? 0) > 0,
    thesisFit: scores?.thesisFit,
    opportunityQuality: scores?.opportunityQuality,
    uncertainty: scores?.uncertainty,
    evidenceConfidence: scores?.evidenceConfidence,
    valuationAttractiveness: scores?.valuationAttractiveness,
    investmentConviction: scores?.investmentConviction,
    nextAction: intel?.nextAction.title,
    lastActivity: intel?.timeline[intel.timeline.length - 1]?.at ?? deal.updatedAt,
  };
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
    return JSON.parse(raw) as Deal;
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
  return loaded
    .filter((deal): deal is Deal => deal !== null)
    .map(summarize)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
