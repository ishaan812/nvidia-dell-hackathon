import { assessStoredFounders } from "../lib/diligence/research";
import { loadDeal, saveDeal } from "../lib/diligence/store";
import { SEED_IDS } from "../lib/intelligence/seed";

async function main() {
  for (const id of SEED_IDS) {
    const deal = await loadDeal(id);
    if (!deal?.intelligence) {
      console.log(id, "missing");
      continue;
    }
    const founders = await assessStoredFounders(deal);
    deal.intelligence.research = { ...deal.intelligence.research, founders };
    deal.updatedAt = new Date().toISOString();
    await saveDeal(deal);
    for (const person of founders) {
      console.log(id, person.name, "spikes", person.spikes.length, person.summary.slice(0, 90));
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
