import { citationLabel } from "./paths";
import { formatMetric, pick } from "./metrics";
import type { Deal, DocKind, Flag, Metric } from "./types";

const PAIRS: { name: string; left: DocKind; right: DocKind; quote: string; pageHint?: number }[] = [
  { name: "arr", left: "deck", right: "financials", quote: "$4.2M ARR" },
  { name: "runway_months", left: "deck", right: "financials", quote: "18 months of runway" },
  { name: "headcount", left: "deck", right: "financials", quote: "40 people" },
  { name: "founder_ownership_pct", left: "deck", right: "cap_table", quote: "Founders 15%" },
];

function relDiff(a: number, b: number): number {
  const denom = Math.max(Math.abs(a), Math.abs(b), 1);
  return Math.abs(a - b) / denom;
}

function deckDoc(deal: Deal) {
  return (
    deal.docs.find((doc) => doc.filename === deal.deckFilename && (doc.role === "deck" || doc.kind === "deck")) ??
    deal.docs.find((doc) => doc.role === "deck" || doc.kind === "deck")
  );
}

function pageFor(deal: Deal, quote: string, fallback?: number): number | null {
  const deck = deckDoc(deal);
  if (!deck) return fallback ?? null;
  const needle = quote.toLowerCase();
  for (const [page, text] of Object.entries(deck.pageTexts)) {
    if (text.toLowerCase().includes(needle)) return Number(page);
  }
  return fallback ?? null;
}

export function runChecklist(deal: Deal, metrics: Metric[]): Flag[] {
  const flags: Flag[] = [];
  const deck = deckDoc(deal);
  const deckId = deck?.docId ?? "deck";

  for (const pair of PAIRS) {
    const left = pick(metrics, pair.name, pair.left);
    const right = pick(metrics, pair.name, pair.right);
    if (!left || !right) continue;
    if (relDiff(left.value, right.value) < 0.08) continue;
    flags.push({
      id: `flag-${pair.name}`,
      docId: deckId,
      page: left.citation.page ?? pageFor(deal, pair.quote),
      type: "highlight",
      severity: "contradiction",
      metric: pair.name,
      quote: pair.quote,
      comment: `Deck claims ${formatMetric(left)}; the ${pair.right === "cap_table" ? "cap table" : "model"} shows ${formatMetric(right)}.`,
      sourceCitation: citationLabel(right.citation),
      sourceFile: right.citation.filename,
      sourceSheet: right.citation.sheet,
      deckValue: formatMetric(left),
      roomValue: formatMetric(right),
    });
  }

  const tam = pick(metrics, "tam", "deck");
  const tamSupport = metrics.find((m) => m.name === "tam" && m.sourceKind !== "deck");
  if (tam && !tamSupport) {
    flags.push({
      id: "flag-tam",
      docId: deckId,
      page: tam.citation.page ?? pageFor(deal, "$48B TAM", 7),
      type: "note",
      severity: "unsupported",
      metric: "tam",
      quote: "$48B TAM",
      comment: `Deck cites ${formatMetric(tam)}. No supporting market study or model line sits in the data room.`,
      sourceCitation: "no supporting document",
      deckValue: formatMetric(tam),
    });
  }

  const kinds = new Set(deal.docs.map((d) => d.kind));
  if (!kinds.has("cap_table")) {
    flags.push({
      id: "flag-missing-cap",
      docId: deckId,
      page: null,
      type: "note",
      severity: "missing",
      quote: "",
      comment: "No cap table in the data room. Ownership and dilution claims cannot be reconciled.",
      sourceCitation: "data room",
    });
  }

  const hasCohort = deal.docs.some((d) => /cohort|unit economics|nrr/i.test(d.markdown));
  if (!hasCohort) {
    flags.push({
      id: "flag-missing-cohorts",
      docId: deckId,
      page: null,
      type: "note",
      severity: "missing",
      quote: "",
      comment: "No cohort or unit-economics exhibit. Retention quality is asserted, not shown.",
      sourceCitation: "data room",
    });
  }

  return flags;
}

export function riskScore(flags: Flag[]): number {
  let score = 18;
  for (const flag of flags) {
    if (flag.severity === "contradiction") score += 16;
    else if (flag.severity === "unsupported") score += 8;
    else score += 4;
  }
  return Math.min(96, score);
}
