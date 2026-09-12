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

async function fromWorkbook(doc: IngestedDoc): Promise<Metric[]> {
  if (!/\.xlsx?$/i.test(doc.filename)) return [];
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(doc.path);
  const found: Metric[] = [];
  workbook.eachSheet((sheet) => {
    sheet.eachRow((row) => {
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

export async function extractMetrics(docs: IngestedDoc[]): Promise<Metric[]> {
  const all: Metric[] = [];
  for (const doc of docs) {
    all.push(...fromMarkdown(doc));
    all.push(...(await fromWorkbook(doc)));
  }
  const best = new Map<string, Metric>();
  for (const metric of all) {
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
