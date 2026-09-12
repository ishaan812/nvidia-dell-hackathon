import { runChecklist } from "../lib/diligence/checklist";
import { extractMetrics } from "../lib/diligence/metrics";
import { loadDeal } from "../lib/diligence/store";

async function main() {
  const id = process.argv[2];
  const deal = await loadDeal(id);
  if (!deal) throw new Error(id);
  const metrics = await extractMetrics(deal.docs);
  const flags = runChecklist({ ...deal, metrics }, metrics);
  console.log(
    JSON.stringify(
      {
        metrics: metrics.map((metric) => ({
          name: metric.name,
          value: metric.value,
          kind: metric.sourceKind,
        })),
        flags: flags.map((flag) => flag.id),
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
