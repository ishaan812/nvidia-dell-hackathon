import ExcelJS from "exceljs";
import { citationLabel } from "./paths";
import type { Citation, DocKind, IngestedDoc, Metric } from "./types";

const MONEY = { k: 1_000, m: 1_000_000, b: 1_000_000_000 };

function money(num: string, suffix?: string): number {
  const n = Number(num.replace(/,/g, ""));
  if (!Number.isFinite(n)) return NaN;
  const mul = suffix ? MONEY[suffix.toLowerCase() as keyof typeof MONEY] ?? 1 : 1;
  return n * mul;
}

export function parseFigure(text: string): { n: number; raw: string; unit: Metric["unit"] } | null {
  const t = text.replace(/\u00a0/g, " ").trim();
  if (!t || /qualitative|^n\/?a$|^tbd$|^\$?x$|illustrative|do not populate/i.test(t)) return null;
  const moneyHit = t.match(/\$\s*(\d+(?:,\d{3})*(?:\.\d+)?)\s*([bmk])?\b/i);
  if (moneyHit) {
    const n = money(moneyHit[1], moneyHit[2]);
    if (Number.isFinite(n)) return { n, raw: moneyHit[0].replace(/\s+/g, ""), unit: "usd" };
  }
  const pct = t.match(/([+-]?\d+(?:\.\d+)?)\s*%/);
  if (pct) {
    const n = Math.abs(Number(pct[1]));
    if (Number.isFinite(n)) return { n, raw: pct[0], unit: "pct" };
  }
  const scaled = t.match(/(\d+(?:,\d{3})*(?:\.\d+)?)\s*([bmk])\b/i);
  if (scaled) {
    const n = money(scaled[1], scaled[2]);
    if (Number.isFinite(n)) return { n, raw: scaled[0].replace(/\s+/g, ""), unit: n >= 1000 ? "people" : "people" };
  }
  const big = t.match(/(\d{1,3}(?:,\d{3}){1,}(?:\.\d+)?)/);
  if (big) {
    const n = Number(big[1].replace(/,/g, ""));
    if (Number.isFinite(n)) return { n, raw: big[1], unit: "people" };
  }
  return null;
}

function isNoiseFigure(value: number, raw: string, pageText?: string): boolean {
  if (/^\d{1,2}$/.test(raw.trim())) return true;
  if (value >= 2000 && value <= 2040 && !/[bmk$%]/i.test(raw)) return true;
  if (value > 0 && value <= 20 && !/[bmk$%]/i.test(raw)) return true;
  if (pageText && /slide\s+\d/i.test(pageText) && value <= 20) return true;
  return false;
}

type Spec = {
  name: string;
  unit: Metric["unit"];
  patterns: RegExp[];
};

const SPECS: Spec[] = [
  {
    name: "arr",
    unit: "usd",
    patterns: [
      /(?:ARR|annual recurring revenue)[^\n$]{0,48}\$([0-9][0-9.,]*)\s*([MmBbKk])?/i,
      /\$([0-9][0-9.,]*)\s*([MmBbKk])?\s*(?:in\s+)?ARR/i,
    ],
  },
  {
    name: "runway_months",
    unit: "months",
    patterns: [
      /([0-9]+(?:\.[0-9]+)?)\s*[-–]?\s*months?\s+(?:of\s+)?runway/i,
      /runway[:\s]+([0-9]+(?:\.[0-9]+)?)\s*months?/i,
    ],
  },
  {
    name: "headcount",
    unit: "people",
    patterns: [
      /(?:team of|headcount[:\s]+|employees[:\s]+)([0-9]{1,4})/i,
      /([0-9]{1,4})\s+(?:people|employees|FTEs?)\b/i,
    ],
  },
  {
    name: "founder_ownership_pct",
    unit: "pct",
    patterns: [
      /founders?[^\d%]{0,28}([0-9]+(?:\.[0-9]+)?)\s*%/i,
    ],
  },
  {
    name: "burn_monthly",
    unit: "usd",
    patterns: [
      /monthly (?:net )?burn\s*[|\t: ]+\s*\$?([0-9][0-9.,]+)\s*([MmKk])?/i,
      /monthly (?:net )?burn[^\n$]{0,24}\$([0-9][0-9.,]*)\s*([MmKk])?/i,
    ],
  },
  {
    name: "cash",
    unit: "usd",
    patterns: [
      /cash(?: on hand)?\s*[|\t: ]+\s*\$?([0-9][0-9.,]+)\s*([MmKk])?/i,
      /(?:cash(?: on hand)?|cash balance)[^\n$]{0,24}\$([0-9][0-9.,]*)\s*([MmKk])?/i,
    ],
  },
  {
    name: "tam",
    unit: "usd",
    patterns: [
      /(?:TAM|total addressable market)[^\n$]{0,40}\$([0-9][0-9.,]*)\s*([BbMm])/i,
      /\$([0-9][0-9.,]*)\s*([BbMm])\s*TAM/i,
    ],
  },
  {
    name: "nrr",
    unit: "pct",
    patterns: [/(?:NRR|net revenue retention)[^\d%]{0,16}([0-9]+(?:\.[0-9]+)?)\s*%/i],
  },
  {
    name: "raise",
    unit: "usd",
    patterns: [/(?:raising|the ask|series [a-z] of)[^\n$]{0,24}\$([0-9][0-9.,]*)\s*([Mm])/i],
  },
];

const SHEET_KEYS: Record<string, { name: string; unit: Metric["unit"] }> = {
  arr: { name: "arr", unit: "usd" },
  "annual recurring revenue": { name: "arr", unit: "usd" },
  "monthly burn": { name: "burn_monthly", unit: "usd" },
  "runway months": { name: "runway_months", unit: "months" },
  runway: { name: "runway_months", unit: "months" },
  headcount: { name: "headcount", unit: "people" },
  employees: { name: "headcount", unit: "people" },
  "cash on hand": { name: "cash", unit: "usd" },
  cash: { name: "cash", unit: "usd" },
  "founder ownership fd": { name: "founder_ownership_pct", unit: "pct" },
  "founders fd %": { name: "founder_ownership_pct", unit: "pct" },
  nrr: { name: "nrr", unit: "pct" },
};

function pageForQuote(doc: IngestedDoc, quote: string): number | undefined {
  const needle = quote.toLowerCase();
  for (const [page, text] of Object.entries(doc.pageTexts)) {
    if (text.toLowerCase().includes(needle)) return Number(page);
  }
  const mark = doc.markdown.match(
    new RegExp(`page:(\\d+)[\\s\\S]{0,400}${quote.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "i"),
  );
  return mark ? Number(mark[1]) : undefined;
}

function fromMarkdown(doc: IngestedDoc): Metric[] {
  const found: Metric[] = [];
  for (const spec of SPECS) {
    for (const re of spec.patterns) {
      const match = re.exec(doc.markdown);
      if (!match) continue;
      let value: number;
      if (spec.unit === "usd") value = money(match[1], match[2]);
      else value = Number(match[1]);
      if (!Number.isFinite(value)) continue;
      const raw = match[0].replace(/\s+/g, " ").trim();
      const page = pageForQuote(doc, match[0].slice(0, 40));
      const citation: Citation = { filename: doc.filename, page, label: spec.name };
      found.push({
        name: spec.name,
        value,
        unit: spec.unit,
        raw,
        sourceKind: doc.kind,
        citation,
      });
      break;
    }
  }
  return found;
}

function slugMetric(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 48);
}

function headlineUnit(label: string, value: number): Metric["unit"] {
  if (/%|ownership|approval|share of/i.test(label)) return "pct";
  if (/month|day|runway/.test(label)) return "months";
  if (/founder|compan|headcount|people|team|investor|step/.test(label)) return "people";
  if (value >= 1000) return "usd";
  return "people";
}

function headerIndex(row: ExcelJS.Row): Record<string, number> {
  const out: Record<string, number> = {};
  row.eachCell((cell, col) => {
    const key = String(cell.text ?? "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
    if (key) out[key] = col;
  });
  return out;
}

function col(map: Record<string, number>, ...names: string[]): number | undefined {
  for (const name of names) {
    if (map[name] != null) return map[name];
  }
  for (const name of names) {
    const hit = Object.entries(map).find(
      ([key]) => key === name || key.endsWith(` ${name}`) || key.startsWith(`${name} `),
    );
    if (hit) return hit[1];
  }
  return undefined;
}

function figureMetric(
  doc: IngestedDoc,
  sheet: string,
  label: string,
  valueText: string,
  page?: number,
): Metric | null {
  const parsed = parseFigure(valueText);
  if (!parsed || isNoiseFigure(parsed.n, parsed.raw)) return null;
  return {
    name: slugMetric(label) || slugMetric(parsed.raw),
    value: parsed.n,
    unit: parsed.unit,
    raw: `${label} :: ${valueText}`.slice(0, 160),
    sourceKind: doc.kind === "other" ? "financials" : doc.kind,
    citation: { filename: doc.filename, sheet, label: label.slice(0, 80), page },
  };
}

function fromClaimTables(doc: IngestedDoc, workbook: ExcelJS.Workbook): Metric[] {
  const found: Metric[] = [];
  workbook.eachSheet((sheet) => {
    const kind = sheet.name.toLowerCase().replace(/[_-]+/g, " ");
    let headers: Record<string, number> | null = null;
    sheet.eachRow((row) => {
      if (!headers) {
        const mapped = headerIndex(row);
        if (col(mapped, "value", "claim", "metric", "evidence", "input")) {
          headers = mapped;
        }
        return;
      }
      const labelCol = col(headers, "claim", "metric", "input", "title", "evidence") ?? 1;
      const valueCol = col(headers, "value", "base value", "base", "relevant evidence", "output") ?? 2;
      const slideCol = col(headers, "slide");
      const label = String(row.getCell(labelCol).text ?? "").trim();
      const valueText = String(row.getCell(valueCol).text ?? row.getCell(valueCol).value ?? "").trim();
      if (!label || /^(claim|metric|input|title|#|\d+)$/i.test(label)) return;
      const page = slideCol ? Number(String(row.getCell(slideCol).text ?? "").replace(/\D/g, "")) : undefined;
      if (/claim|market|assumption|source|financial|model|tam/i.test(kind) || page) {
        const metric = figureMetric(doc, sheet.name, label, valueText, Number.isFinite(page) ? page : undefined);
        if (metric) found.push(metric);
      }
    });
  });
  return found;
}

function fromDeckFigures(doc: IngestedDoc): Metric[] {
  if (doc.kind !== "deck" && doc.role !== "deck") return [];
  const found: Metric[] = [];
  for (const [page, text] of Object.entries(doc.pageTexts)) {
    const seen = new Set<string>();
    const re =
      /\$\s*\d[\d,]*(?:\.\d+)?\s*[bmk]?\b|\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d+(?:\.\d+)?\s*%|\d+(?:\.\d+)?[bmk]\b/gi;
    for (const match of text.matchAll(re)) {
      const raw = match[0].trim();
      if (seen.has(raw)) continue;
      seen.add(raw);
      const parsed = parseFigure(raw);
      if (!parsed || isNoiseFigure(parsed.n, parsed.raw, text)) continue;
      const around = text.slice(Math.max(0, match.index! - 40), match.index! + raw.length + 40).replace(/\s+/g, " ");
      found.push({
        name: `slide_${page}_${slugMetric(parsed.raw)}`,
        value: parsed.n,
        unit: parsed.unit,
        raw: around || raw,
        sourceKind: "deck",
        citation: { filename: doc.filename, page: Number(page), label: raw },
      });
    }
  }
  return found;
}

function roomRank(metric: Metric): number {
  const sheet = metric.citation.sheet ?? "";
  if (/claim/i.test(sheet)) return 4;
  if (/market/i.test(sheet)) return 3;
  if (/assumption/i.test(sheet)) return 2;
  if (/headline/i.test(sheet)) return 5;
  return 1;
}

function collapseRoom(metrics: Metric[]): Metric[] {
  const room = metrics.filter((metric) => metric.sourceKind !== "deck");
  const deck = metrics.filter((metric) => metric.sourceKind === "deck");
  const best = new Map<string, Metric>();
  for (const metric of room) {
    const key = metric.unit === "pct" ? metric.name : `${metric.unit}:${metric.value}`;
    const prev = best.get(key);
    if (!prev || roomRank(metric) > roomRank(prev)) best.set(key, metric);
  }
  return [...best.values(), ...deck];
}

function pairDeckToRoom(metrics: Metric[]): Metric[] {
  const collapsed = collapseRoom(metrics);
  const room = collapsed
    .filter((metric) => metric.sourceKind !== "deck")
    .toSorted((a, b) => roomRank(b) - roomRank(a));
  const deck = collapsed.filter((metric) => metric.sourceKind === "deck");
  const used = new Set<number>();
  for (const left of room) {
    let best = -1;
    let bestScore = 0.08;
    const words = (left.citation.label ?? left.name)
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((word) => word.length > 3);
    for (let i = 0; i < deck.length; i++) {
      if (used.has(i)) continue;
      if (deck[i].unit !== left.unit) continue;
      const diff =
        Math.abs(deck[i].value - left.value) / Math.max(Math.abs(deck[i].value), Math.abs(left.value), 1);
      const pagePenalty =
        left.citation.page && deck[i].citation.page && left.citation.page !== deck[i].citation.page ? 0.2 : 0;
      const blob = `${deck[i].raw} ${deck[i].citation.label ?? ""}`.toLowerCase();
      const hits = words.filter((word) => blob.includes(word)).length;
      const score = diff + pagePenalty - Math.min(2, hits) * 0.03;
      if (score < bestScore) {
        best = i;
        bestScore = score;
      }
    }
    if (best >= 0) {
      deck[best] = { ...deck[best], name: left.name };
      used.add(best);
    }
  }
  return [...room, ...deck];
}

async function fromWorkbook(doc: IngestedDoc): Promise<Metric[]> {
  if (!/\.xlsx?$/i.test(doc.filename)) return [];
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(doc.path);
  const found: Metric[] = fromClaimTables(doc, workbook);
  workbook.eachSheet((sheet) => {
    const headline = /headline/i.test(sheet.name);
    sheet.eachRow((row) => {
      if (headline) {
        const label = String(row.getCell(2).text ?? "").trim();
        const calc = row.getCell(3);
        const rounded = String(row.getCell(4).text ?? "").trim();
        const numeric =
          typeof calc.value === "number" ? calc.value : Number(String(calc.text ?? "").replace(/[£$,%]/g, ""));
        if (!label || !Number.isFinite(numeric) || /metric|#/i.test(label)) return;
        const unit = headlineUnit(label, numeric);
        const value = unit === "pct" && numeric > 0 && numeric <= 1 ? numeric * 100 : numeric;
        const name = slugMetric(label);
        found.push({
          name,
          value,
          unit,
          raw: `${label} :: ${rounded || calc.text}`,
          sourceKind: doc.kind === "other" ? "financials" : doc.kind,
          citation: { filename: doc.filename, sheet: sheet.name, label },
        });
        return;
      }
      const label = String(row.getCell(1).text ?? "")
        .trim()
        .toLowerCase();
      const mapped = SHEET_KEYS[label];
      if (!mapped) return;
      const cell = row.getCell(2);
      let value = typeof cell.value === "number" ? cell.value : Number(String(cell.text).replace(/[$,%]/g, ""));
      if (mapped.unit === "pct" && value > 1 && value <= 100) {
        // already percent points
      } else if (mapped.unit === "pct" && value > 0 && value <= 1) {
        value *= 100;
      }
      if (!Number.isFinite(value)) return;
      const citation: Citation = {
        filename: doc.filename,
        sheet: sheet.name,
        label: mapped.name,
      };
      found.push({
        name: mapped.name,
        value,
        unit: mapped.unit,
        raw: `${row.getCell(1).text} ${cell.text}`,
        sourceKind: doc.kind === "other" ? "financials" : doc.kind,
        citation,
      });
    });
  });
  return found;
}

function prefer(a: Metric, b: Metric): Metric {
  const sheet = (m: Metric) => (m.citation.sheet ? 1 : 0);
  const monthly = (m: Metric) => (/monthly/i.test(m.raw) ? 1 : 0);
  const nonzero = (m: Metric) => (m.value ? 1 : 0);
  const score = (m: Metric) => nonzero(m) * 10 + sheet(m) * 5 + monthly(m);
  return score(b) > score(a) ? b : a;
}

function dropDuplicateDeck(metrics: Metric[]): Metric[] {
  const named = metrics.filter((metric) => metric.sourceKind === "deck" && !metric.name.startsWith("slide_"));
  return metrics.filter((metric) => {
    if (metric.sourceKind !== "deck" || !metric.name.startsWith("slide_")) return true;
    return !named.some((other) => {
      const denom = Math.max(Math.abs(other.value), Math.abs(metric.value), 1);
      return Math.abs(other.value - metric.value) / denom < 0.03;
    });
  });
}

export async function extractMetrics(docs: IngestedDoc[]): Promise<Metric[]> {
  const all: Metric[] = [];
  for (const doc of docs) {
    all.push(...fromMarkdown(doc));
    all.push(...(await fromWorkbook(doc)));
  }
  const claimish = all.some((metric) => /claim|market[_ ]?data|^sources$/i.test(metric.citation.sheet ?? ""));
  if (claimish) {
    for (const doc of docs) all.push(...fromDeckFigures(doc));
  }
  const paired = dropDuplicateDeck(pairDeckToRoom(all));
  const best = new Map<string, Metric>();
  for (const metric of paired) {
    if (!Number.isFinite(metric.value) || metric.value === 0) continue;
    const key = `${metric.name}:${metric.sourceKind}`;
    const prev = best.get(key);
    best.set(key, prev ? prefer(prev, metric) : metric);
  }
  return [...best.values()];
}

export function formatMetric(m: Metric): string {
  if (m.unit === "usd") {
    if (m.value >= 1_000_000_000) return `$${(m.value / 1_000_000_000).toFixed(1)}B`;
    if (m.value >= 1_000_000) return `$${(m.value / 1_000_000).toFixed(1)}M`;
    if (m.value >= 1_000) return `$${(m.value / 1_000).toFixed(0)}k`;
    return `$${m.value.toLocaleString("en-US")}`;
  }
  if (m.unit === "pct") return `${Number(m.value.toFixed(1))}%`;
  if (m.unit === "months") return `${m.value} months`;
  if (m.unit === "people") return `${m.value} people`;
  return `${m.value}`;
}

export function pick(metrics: Metric[], name: string, kind?: DocKind): Metric | undefined {
  return metrics.find((m) => m.name === name && (!kind || m.sourceKind === kind));
}

export { citationLabel };
