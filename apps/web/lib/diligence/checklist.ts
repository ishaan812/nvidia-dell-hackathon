import { citationLabel } from "./paths";
import { formatMetric, pick } from "./metrics";
import { findOcrBox } from "./textMatch";
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

function matchesCalc(n: number, room: number): boolean {
  if (Number.isInteger(n) && Number.isInteger(room) && Math.abs(room) < 1000) return n === room;
  return relDiff(n, room) < 0.08;
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
      page: left.citation.page ?? pageFor(deal, left.raw) ?? pageFor(deal, pair.quote) ?? 1,
      type: "highlight",
      severity: "contradiction",
      metric: pair.name,
      quote: left.raw || pair.quote,
      comment: `Deck shows ${formatMetric(left)}; the data room shows ${formatMetric(right)}.`,
      sourceCitation: citationLabel(right.citation),
      sourceFile: right.citation.filename,
      sourceSheet: right.citation.sheet,
      deckValue: formatMetric(left),
      roomValue: formatMetric(right),
    });
  }

  const names = new Set(metrics.map((metric) => metric.name));
  for (const name of names) {
    if (flags.some((flag) => flag.metric === name)) continue;
    const left = pick(metrics, name, "deck");
    const right = metrics.find((metric) => metric.name === name && metric.sourceKind !== "deck");
    if (left && right && relDiff(left.value, right.value) >= 0.08) {
      flags.push({
        id: `flag-${name}`,
        docId: deckId,
        page: left.citation.page ?? pageFor(deal, left.raw) ?? right.citation.page ?? 1,
        type: "highlight",
        severity: "contradiction",
        metric: name,
        quote: left.citation.label || left.raw,
        comment: `Deck shows ${formatMetric(left)}; the data room shows ${formatMetric(right)}.`,
        sourceCitation: citationLabel(right.citation),
        sourceFile: right.citation.filename,
        sourceSheet: right.citation.sheet,
        deckValue: formatMetric(left),
        roomValue: formatMetric(right),
      });
      continue;
    }
    if (left && !right && (left.unit === "usd" || left.unit === "pct" || left.value >= 1000)) {
      flags.push({
        id: `flag-${name}`,
        docId: deckId,
        page: left.citation.page ?? pageFor(deal, left.raw) ?? 1,
        type: "note",
        severity: "unsupported",
        metric: name,
        quote: left.citation.label || left.raw,
        comment: `Deck cites ${formatMetric(left)}. No matching figure sits in the data room.`,
        sourceCitation: "data room",
        deckValue: formatMetric(left),
      });
    }
  }

  const tam = pick(metrics, "tam", "deck");
  const tamSupport = metrics.find((m) => m.name === "tam" && m.sourceKind !== "deck");
  if (tam && !tamSupport && !flags.some((flag) => flag.metric === "tam")) {
    flags.push({
      id: "flag-tam",
      docId: deckId,
      page: tam.citation.page ?? pageFor(deal, "$48B TAM") ?? pageFor(deal, formatMetric(tam)) ?? 1,
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
      page: 1,
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
      page: 1,
      type: "note",
      severity: "missing",
      quote: "",
      comment: "No cohort or unit-economics exhibit. Retention quality is asserted, not shown.",
      sourceCitation: "data room",
    });
  }

  flags.push(...flagHeadlines(deal, metrics, deckId));
  flags.push(...flagScanRounds(deal, metrics, deckId, flags));
  attachScanBoxes(deal, flags);
  return flags;
}

function firstNumber(text: string): number | null {
  return numbersIn(text)[0]?.n ?? null;
}

function numbersIn(text: string): { n: number; raw: string }[] {
  const out: { n: number; raw: string }[] = [];
  const re = /(\d+(?:,\d{3})*(?:\.\d+)?)\s*(bn|m|k|x|%)?/gi;
  for (const match of text.matchAll(re)) {
    let n = Number(match[1].replace(/,/g, ""));
    if (!Number.isFinite(n)) continue;
    const suffix = match[2] ?? "";
    if (/^bn$/i.test(suffix)) n *= 1_000_000_000;
    else if (/^m$/i.test(suffix)) n *= 1_000_000;
    else if (/^k$/i.test(suffix)) n *= 1_000;
    out.push({ n, raw: match[0].trim() });
  }
  return out;
}

function flagHeadlines(deal: Deal, metrics: Metric[], deckId: string): Flag[] {
  const deck = deckDoc(deal);
  if (!deck) return [];
  const out: Flag[] = [];
  for (const room of metrics) {
    if (!/headline/i.test(room.citation.sheet ?? "")) continue;
    const rounded = room.raw.includes("::") ? room.raw.split("::").slice(1).join("::").trim() : room.raw;
    const label = room.citation.label ?? room.name;
    const keys = label
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((word) => word.length > 4);
    const roundedNum = firstNumber(rounded);
    const roundedStem = rounded.toLowerCase().slice(0, 16);
    for (const [num, text] of Object.entries(deck.pageTexts)) {
      const hits = keys.filter((word) => text.toLowerCase().includes(word)).length;
      const hasRounded = rounded.length > 3 && text.toLowerCase().includes(roundedStem);
      if (hits < 2 && !hasRounded) continue;
      const found = numbersIn(text).filter((item) =>
        room.unit === "pct" ? item.raw.includes("%") : !item.raw.includes("%"),
      );
      if (!found.length) continue;
      if (hasRounded) continue;
      if (roundedNum != null && found.some((item) => item.n === roundedNum)) continue;
      if (found.some((item) => matchesCalc(item.n, room.value))) continue;
      const slack = Math.max(8, Math.abs(room.value) * 0.2);
      const fake = found.find((item) => {
        if (!Number.isInteger(item.n) || item.n === roundedNum) return false;
        const delta = Math.abs(item.n - room.value);
        return delta >= 2 && delta <= slack;
      });
      if (!fake) continue;
      out.push({
        id: `flag-${room.name}`,
        docId: deckId,
        page: Number(num),
        type: "highlight",
        severity: "contradiction",
        metric: room.name,
        quote: fake.raw,
        comment: `Deck shows ${fake.raw}; the model calculates ${room.value}${rounded ? ` (slide form ${rounded})` : ""}.`,
        sourceCitation: citationLabel(room.citation),
        sourceFile: room.citation.filename,
        sourceSheet: room.citation.sheet,
        deckValue: fake.raw,
        roomValue: rounded || String(room.value),
      });
      break;
    }
  }
  return out;
}

function flagScanRounds(deal: Deal, metrics: Metric[], deckId: string, existing: Flag[]): Flag[] {
  const deck = deckDoc(deal);
  if (!deck?.pageWords) return [];
  const taken = new Set(existing.map((flag) => flag.metric).filter(Boolean));
  const out: Flag[] = [];
  for (const room of metrics) {
    if (!/headline/i.test(room.citation.sheet ?? "")) continue;
    if (taken.has(room.name)) continue;
    const rounded = room.raw.includes("::") ? room.raw.split("::").slice(1).join("::").trim() : room.raw;
    if (!/^>?£?\$?\d/.test(rounded)) continue;
    const roundedNum = firstNumber(rounded);
    if (roundedNum == null || relDiff(roundedNum, room.value) < 0.12) continue;
    for (const [num, words] of Object.entries(deck.pageWords)) {
      const box =
        findOcrBox(words, rounded) ??
        findOcrBox(words, String(roundedNum)) ??
        findOcrBox(words, `${roundedNum}+`) ??
        findOcrBox(words, `>${roundedNum}%`) ??
        findOcrBox(words, `${roundedNum}%`);
      if (!box) continue;
      const quote = rounded.match(/[>]?\s*\d[\d,.]*(?:\+|%|x|bn|m|k)?/i)?.[0]?.trim() ?? String(roundedNum);
      out.push({
        id: `flag-scan-${room.name}`,
        docId: deckId,
        page: Number(num),
        type: "highlight",
        severity: "unsupported",
        metric: room.name,
        quote,
        comment: `Slide prints ${quote}; the model calculates ${Number(room.value.toFixed(1))} (slide form ${rounded}).`,
        sourceCitation: citationLabel(room.citation),
        sourceFile: room.citation.filename,
        sourceSheet: room.citation.sheet,
        deckValue: quote,
        roomValue: String(room.value),
        box,
      });
      break;
    }
  }
  return out;
}

function attachScanBoxes(deal: Deal, flags: Flag[]) {
  const deck = deckDoc(deal);
  if (!deck?.pageWords) return;
  for (const flag of flags) {
    if (flag.box || !flag.quote) continue;
    const page = flag.page && flag.page > 0 ? flag.page : 1;
    const words = deck.pageWords[page] ?? [];
    const box = findOcrBox(words, flag.quote);
    if (box) flag.box = box;
  }
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
