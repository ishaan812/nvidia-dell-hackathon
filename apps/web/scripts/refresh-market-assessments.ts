import { assessStoredMarket } from "../lib/diligence/research";
import { loadDeal, saveDeal } from "../lib/diligence/store";
import { SEED_IDS } from "../lib/intelligence/seed";

async function main() {
  for (const id of SEED_IDS) {
    const deal = await loadDeal(id);
    if (!deal?.intelligence?.research?.market) {
      console.log(id, "no market hits");
      continue;
    }
    const market = await assessStoredMarket(deal);
    deal.intelligence.research = { ...deal.intelligence.research, market };
    deal.updatedAt = new Date().toISOString();
    await saveDeal(deal);
    console.log(id, market.insights.map((item) => item.title).join(","), market.summary.slice(0, 100));
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
