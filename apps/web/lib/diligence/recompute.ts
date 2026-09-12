import { mkdir } from "node:fs/promises";
import path from "node:path";
import { firecrawlReady } from "./firecrawl";
import { addFilesToDeal } from "./pipeline";
import { dirs } from "./paths";
import { researchFounders, researchMarket } from "./research";
import { loadDeal, saveDeal } from "./store";
import type { Deal } from "./types";

export async function recomputeDeal(deal: Deal): Promise<Deal> {
  deal.memo = undefined;
  const folder = path.join(dirs().staging, `recompute-${deal.id}-${Date.now()}`);
  await mkdir(folder, { recursive: true });
  return addFilesToDeal(deal, folder);
}

export type DeskStep = { id: "financials" | "founders" | "market"; ok: boolean; detail: string };

export async function recomputeDesk(deal: Deal): Promise<{ deal: Deal; steps: DeskStep[] }> {
  const steps: DeskStep[] = [];
  let current = deal;

  try {
    current = await recomputeDeal(current);
    steps.push({ id: "financials", ok: true, detail: `${current.flags.length} findings` });
  } catch (error) {
    steps.push({ id: "financials", ok: false, detail: (error as Error).message });
    current = (await loadDeal(deal.id)) ?? deal;
  }

  if (!current.intelligence) {
    throw new Error("Deal has no intelligence packet.");
  }
  if (!firecrawlReady()) {
    throw new Error("Add FIRECRAWL_API_KEY to recompute LinkedIn and market.");
  }

  const founders = await researchFounders(current);
  current.intelligence.research = { ...current.intelligence.research, founders };
  current.updatedAt = new Date().toISOString();
  await saveDeal(current);
  steps.push({ id: "founders", ok: true, detail: `${founders.length} founder reads` });

  const market = await researchMarket(current);
  current.intelligence.research = { ...current.intelligence.research, market };
  current.updatedAt = new Date().toISOString();
  await saveDeal(current);
  steps.push({ id: "market", ok: true, detail: "Market memo written" });

  return { deal: current, steps };
}
