import { mkdir } from "node:fs/promises";
import path from "node:path";
import { addFilesToDeal } from "./pipeline";
import { dirs } from "./paths";
import type { Deal } from "./types";

export async function recomputeDeal(deal: Deal): Promise<Deal> {
  deal.memo = undefined;
  const folder = path.join(dirs().staging, `recompute-${deal.id}-${Date.now()}`);
  await mkdir(folder, { recursive: true });
  return addFilesToDeal(deal, folder);
}
