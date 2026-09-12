import path from "node:path";
import { annotateDeck } from "../lib/diligence/annotate";
import { riskScore, runChecklist } from "../lib/diligence/checklist";
import { buildGraph } from "../lib/diligence/graph";
import { ingestFolder } from "../lib/diligence/ingest";
import { extractMetrics } from "../lib/diligence/metrics";
import { dirs } from "../lib/diligence/paths";
import { rolesFromDocs } from "../lib/diligence/roles";
import { loadDeal, saveDeal } from "../lib/diligence/store";

async function main() {
  const id = process.argv[2];
  if (!id) {
    console.error("usage: tsx scripts/refresh-flags.ts <deal-id>");
    process.exit(1);
  }

  const deal = await loadDeal(id);
  if (!deal?.sandbox?.workspace) {
    console.error("no deal / workspace");
    process.exit(1);
  }

  deal.docs = await ingestFolder(deal.sandbox.workspace, rolesFromDocs(deal.docs));
  deal.metrics = await extractMetrics(deal.docs);
  deal.flags = runChecklist(deal, deal.metrics);
  deal.riskScore = riskScore(deal.flags);
  deal.graph = buildGraph(deal.company, deal.metrics, deal.flags, deal.docs);
  deal.updatedAt = new Date().toISOString();
  await annotateDeck(deal, path.join(dirs().outbox, deal.id));
  await saveDeal(deal);

  const deck = deal.docs.find((doc) => doc.role === "deck");
  console.log(
    JSON.stringify(
      {
        id: deal.id,
        flags: deal.flags.map((flag) => ({
          id: flag.id,
          page: flag.page,
          quote: flag.quote,
          box: flag.box,
          comment: flag.comment,
        })),
        words: Object.fromEntries(
          Object.entries(deck?.pageWords ?? {}).map(([page, words]) => [
            page,
            (words ?? []).slice(0, 12).map((word) => word.t),
          ]),
        ),
        metrics: deal.metrics.map((metric) => ({
          name: metric.name,
          value: metric.value,
          kind: metric.sourceKind,
          sheet: metric.citation.sheet,
          page: metric.citation.page,
        })),
        headlines: deal.metrics
          .filter((metric) => /headline/i.test(metric.citation.sheet ?? ""))
          .map((metric) => ({ name: metric.name, value: metric.value, raw: metric.raw })),
        ocr: Object.fromEntries(
          Object.entries(deck?.pageTexts ?? {}).map(([page, text]) => [page, text.slice(0, 160)]),
        ),
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
