import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { cp, mkdir, readdir } from "node:fs/promises";
import path from "node:path";
import { annotateDeck } from "./annotate";
import { riskScore, runChecklist } from "./checklist";
import { resolveExisting } from "./files";
import { buildGraph } from "./graph";
import { ingestFolder } from "./ingest";
import { draftMemo } from "./memo";
import { extractMetrics } from "./metrics";
import { dirs } from "./paths";
import { applyRoles, deckDocs, rolesFromDocs } from "./roles";
import { addToWorkspace, dealRoot, isolateDeal } from "./sandbox";
import { saveDeal } from "./store";
import type { Deal, DealEvent, DealSandbox, FileRole } from "./types";

function slug(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
}

function guessCompany(folder: string, files: string[]): string {
  if (files.some((f) => /northstar/i.test(f))) return "Northstar Robotics";
  const fromName = path.basename(folder).replace(/[-_]/g, " ").replace(/\d+/g, "").trim();
  if (fromName && fromName.toLowerCase() !== "northstar") {
    return fromName.replace(/\b\w/g, (c) => c.toUpperCase()) || "Untitled deal";
  }
  return "Untitled deal";
}

function pusher(events: DealEvent[]) {
  return (stage: DealEvent["stage"], message: string) => {
    events.push({ at: new Date().toISOString(), stage, message });
  };
}

function syncDecks(deal: Deal) {
  deal.deckFilenames = deckDocs(deal.docs).map((doc) => doc.filename);
  deal.deckFilename = deal.deckFilenames[0];
}

async function finishDeal(
  deal: Deal,
  push: ReturnType<typeof pusher>,
  opts: { refreshOnly?: boolean; roles?: Record<string, FileRole>; skipIngest?: boolean } = {},
): Promise<Deal> {
  if (!deal.sandbox) throw new Error("Deal has no workspace");
  const roles = { ...rolesFromDocs(deal.docs), ...opts.roles };
  if (!opts.skipIngest) {
    deal.docs = await ingestFolder(deal.sandbox.workspace, roles);
  } else {
    applyRoles(deal.docs, roles);
  }
  deal.company = deal.company || guessCompany(deal.sourcePath, deal.docs.map((d) => d.filename));
  syncDecks(deal);
  deal.status = "graphing";
  deal.updatedAt = new Date().toISOString();
  await saveDeal(deal);

  push("graph", "Extracting numbers and linking sources");
  deal.metrics = await extractMetrics(deal.docs);
  deal.status = "diligence";
  await saveDeal(deal);

  push("diligence", "Cross-checking the deck against the financials");
  deal.flags = runChecklist(deal, deal.metrics);
  deal.riskScore = riskScore(deal.flags);
  deal.graph = buildGraph(deal.company, deal.metrics, deal.flags, deal.docs);

  if (!opts.refreshOnly || !deal.memo) {
    deal.status = "annotating";
    push("annotate", "Marking the deck and drafting the memo");
    try {
      deal.memo = await draftMemo(deal);
      await annotateDeck(deal, path.join(dirs().outbox, deal.id));
    } catch (error) {
      push("annotate", `Memo kept moving: ${(error as Error).message}`);
    }
  }

  deal.status = "ready";
  deal.error = undefined;
  deal.updatedAt = new Date().toISOString();
  push("ready", `${deal.flags.length} findings · risk ${deal.riskScore}`);
  await saveDeal(deal);
  return deal;
}

export async function ensureWorkspace(deal: Deal): Promise<DealSandbox> {
  const workspace =
    deal.sandbox?.workspace && existsSync(deal.sandbox.workspace)
      ? deal.sandbox.workspace
      : path.join(dealRoot(deal.id), "workspace");
  await mkdir(workspace, { recursive: true });
  const present = new Set(await readdir(workspace));
  for (const doc of deal.docs) {
    const destName = path.basename(doc.filename);
    if (present.has(destName)) continue;
    const src = resolveExisting(doc.path, destName);
    if (!src) continue;
    await cp(src, path.join(workspace, destName));
    present.add(destName);
  }
  deal.sandbox = { kind: "local", root: dealRoot(deal.id), workspace };
  return deal.sandbox;
}

export async function runDeal(
  sourcePath: string,
  name?: string,
  roles: Record<string, FileRole> = {},
): Promise<Deal> {
  const now = new Date().toISOString();
  sourcePath = path.resolve(sourcePath);
  const id = `${slug(name || path.basename(sourcePath))}-${randomUUID().slice(0, 8)}`;
  const events: DealEvent[] = [];
  const push = pusher(events);

  const deal: Deal = {
    id,
    name: name || path.basename(sourcePath),
    company: "",
    status: "ingesting",
    createdAt: now,
    updatedAt: now,
    sourcePath,
    docs: [],
    metrics: [],
    flags: [],
    graph: { nodes: [], edges: [], rows: [] },
    events,
  };

  try {
    push("ingest", "Sealing a room and reading the files");
    deal.sandbox = await isolateDeal(id, sourcePath);
    return await finishDeal(deal, push, { roles });
  } catch (error) {
    deal.status = "error";
    deal.error = (error as Error).message;
    deal.updatedAt = new Date().toISOString();
    push("error", deal.error);
    await saveDeal(deal);
    throw error;
  }
}

export async function addFilesToDeal(
  deal: Deal,
  incomingPath: string,
  roles: Record<string, FileRole> = {},
): Promise<Deal> {
  deal.events = deal.events ?? [];
  const push = pusher(deal.events);
  const prior = deal.status === "error" ? "ready" : deal.status;
  try {
    deal.status = "ingesting";
    deal.error = undefined;
    push("ingest", "Adding files to the room");
    deal.sandbox = await ensureWorkspace(deal);
    await addToWorkspace(deal.sandbox.workspace, incomingPath);
    return await finishDeal(deal, push, { refreshOnly: Boolean(deal.memo), roles });
  } catch (error) {
    deal.error = (error as Error).message;
    deal.status = deal.memo && deal.flags.length ? "ready" : prior;
    deal.updatedAt = new Date().toISOString();
    push("error", deal.error);
    await saveDeal(deal);
    throw error;
  }
}

export async function setFileRole(deal: Deal, filename: string, role: FileRole): Promise<Deal> {
  if (!deal.docs.some((doc) => doc.filename === filename)) {
    throw new Error("That file is not in this room");
  }
  const push = pusher(deal.events ?? (deal.events = []));
  push("ingest", role === "deck" ? `Marking ${filename} as a deck` : `Moving ${filename} into the data room`);
  return finishDeal(deal, push, {
    refreshOnly: true,
    skipIngest: true,
    roles: { [filename]: role },
  });
}
