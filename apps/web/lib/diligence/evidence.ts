import ExcelJS from "exceljs";
import mammoth from "mammoth";
import { formatMetric, pick } from "./metrics";
import { resolveExisting } from "./files";
import { dealRoot } from "./sandbox";
import type { Deal, Flag, FlagView, IngestedDoc, PreviewSheet, SourcePreview } from "./types";
import path from "node:path";
import { existsSync } from "node:fs";

export const METRIC_LABELS: Record<string, string> = {
  arr: "Annual recurring revenue",
  runway_months: "Runway",
  headcount: "Headcount",
  founder_ownership_pct: "Founder ownership",
  burn_monthly: "Monthly burn",
  cash: "Cash on hand",
  tam: "Market size",
  nrr: "Net revenue retention",
  raise: "The ask",
};

const NEEDLES: Record<string, string[]> = {
  arr: ["arr", "annual recurring"],
  runway_months: ["runway"],
  headcount: ["headcount", "employees"],
  founder_ownership_pct: ["founder ownership", "founders fd", "founders"],
  burn_monthly: ["monthly burn", "burn"],
  cash: ["cash on hand", "cash"],
  tam: ["tam", "addressable"],
  nrr: ["nrr"],
  raise: ["raising", "the ask"],
};

function prettyCell(value: string): string {
  const trimmed = value.replace(/,/g, "").trim();
  if (!/^\d+(\.\d+)?$/.test(trimmed)) return value;
  const n = Number(trimmed);
  if (!Number.isFinite(n)) return value;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 10_000) return n.toLocaleString("en-US");
  return value;
}

function tablesFromMarkdown(markdown: string): { sheet?: string; rows: string[][] }[] {
  const chunks = markdown.split(/^## /m);
  const tables: { sheet?: string; rows: string[][] }[] = [];
  for (const chunk of chunks) {
    const lines = chunk.split("\n");
    const heading = lines[0]?.replace(/<!--.*?-->/g, "").trim();
    const tableLines = lines.filter((line) => line.trim().startsWith("|"));
    if (tableLines.length < 2) continue;
    const rows = tableLines
      .filter((line) => !/^\|\s*[-: ]+\|/.test(line.trim()))
      .map((line) =>
        line
          .split("|")
          .slice(1, -1)
          .map((cell) => cell.trim()),
      )
      .filter((row) => row.some((cell) => cell.length > 0));
    if (!rows.length) continue;
    tables.push({
      sheet: heading && !heading.startsWith("source:") ? heading : undefined,
      rows,
    });
  }
  return tables;
}

function excerptText(markdown: string, highlight?: string): string {
  const clean = markdown.replace(/<!--.*?-->/g, "").replace(/^#+\s+/gm, "").trim();
  if (!highlight) return clean.slice(0, 360);
  const idx = clean.toLowerCase().indexOf(highlight.toLowerCase());
  if (idx < 0) return clean.slice(0, 360);
  const start = Math.max(0, idx - 80);
  return `${start > 0 ? "…" : ""}${clean.slice(start, start + 280).trim()}${clean.length > start + 280 ? "…" : ""}`;
}

function paragraphsFromMarkdown(markdown: string): string[] {
  return markdown
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/_(.*?)_/g, "$1")
    .split(/\n{2,}/)
    .map((part) =>
      part
        .replace(/^#+\s+/gm, "")
        .replace(/[ \t]+/g, " ")
        .trim(),
    )
    .filter((part) => part.length > 0);
}

function formatExcelCell(cell: ExcelJS.Cell): string {
  const value = cell.value;
  if (value == null || value === "") return "";
  if (typeof value === "number") {
    if (typeof cell.numFmt === "string" && cell.numFmt.includes("%")) {
      return `${(value <= 1 ? value * 100 : value).toFixed(1)}%`;
    }
    if (Math.abs(value) >= 1000) return value.toLocaleString("en-US");
    return String(value);
  }
  const text = cell.text?.replace(/\s+/g, " ").trim();
  return text || "";
}

function sanitizeDocHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, "")
    .replace(/\son\w+="[^"]*"/gi, "")
    .replace(/\son\w+='[^']*'/gi, "");
}

function markDocHtml(html: string, highlight?: string): string {
  if (!highlight) return html;
  const escaped = highlight.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return html.replace(new RegExp(escaped, "gi"), (match) => `<mark class="word-hit">${match}</mark>`);
}

async function previewWord(filePath: string, filename: string, highlight?: string): Promise<SourcePreview> {
  const result = await mammoth.convertToHtml({ path: filePath });
  return {
    filename,
    kind: "doc",
    highlight,
    html: markDocHtml(sanitizeDocHtml(result.value), highlight),
    paragraphs: paragraphsFromMarkdown(result.value.replace(/<[^>]+>/g, "\n")),
    excerpt: excerptText(result.value.replace(/<[^>]+>/g, " "), highlight),
  };
}

async function previewWorkbook(filePath: string, filename: string): Promise<SourcePreview> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);
  const sheets: PreviewSheet[] = workbook.worksheets.map((sheet) => {
    const rows: PreviewSheet["rows"] = [];
    sheet.eachRow({ includeEmpty: false }, (row) => {
      const last = row.cellCount;
      const cells: string[] = [];
      for (let col = 1; col <= Math.min(last, 8); col++) {
        cells.push(formatExcelCell(row.getCell(col)));
      }
      if (cells.some((cell) => cell.length > 0)) rows.push({ cells, hit: false });
    });
    return { name: sheet.name, rows: rows.slice(0, 30) };
  });
  const first = sheets[0];
  return {
    filename,
    kind: "sheet",
    sheet: first?.name,
    sheets,
    rows: first?.rows,
  };
}

export function previewDoc(
  doc: IngestedDoc,
  metric?: string,
  highlight?: string,
  sheet?: string,
  full = false,
): SourcePreview {
  const needles = [
    ...(metric ? NEEDLES[metric] ?? [metric.replaceAll("_", " ")] : []),
    highlight?.toLowerCase() ?? "",
    sheet?.toLowerCase() ?? "",
  ].filter(Boolean);

  const tables = tablesFromMarkdown(doc.markdown);
  const preferred =
    (sheet && tables.find((table) => table.sheet?.toLowerCase() === sheet.toLowerCase())) ??
    tables.find((table) =>
      table.rows.some((row) => needles.some((needle) => row.join(" ").toLowerCase().includes(needle))),
    ) ??
    tables[0];

  if (preferred?.rows.length) {
    const decorated = preferred.rows.map((cells) => {
      const blob = cells.join(" ").toLowerCase();
      const hit = needles.some((needle) => needle.length > 1 && blob.includes(needle));
      return { cells: cells.map(prettyCell), hit };
    });
    if (!decorated.some((row) => row.hit) && decorated.length > 1) decorated[1].hit = true;
    const hitAt = decorated.findIndex((row) => row.hit);
    const start = Math.max(0, (hitAt < 0 ? 0 : hitAt) - 1);
    return {
      filename: doc.filename,
      kind: "sheet",
      sheet: sheet ?? preferred.sheet,
      highlight,
      rows: full ? decorated.slice(0, 16) : decorated.slice(start, start + 8),
    };
  }

  return {
    filename: doc.filename,
    kind: "text",
    sheet,
    highlight,
    excerpt: excerptText(doc.markdown, highlight),
    paragraphs: paragraphsFromMarkdown(doc.markdown),
  };
}

export async function previewFile(deal: Deal, filename: string): Promise<SourcePreview | undefined> {
  const doc = deal.docs.find((item) => item.filename === filename);
  if (!doc) return undefined;
  const filePath = resolveDealSource(deal, filename);
  if (filePath && /\.(xlsx?|csv)$/i.test(filename)) {
    try {
      return await previewWorkbook(filePath, filename);
    } catch {
      // fall through to markdown tables
    }
  }
  if (filePath && /\.docx$/i.test(filename)) {
    try {
      return await previewWord(filePath, filename);
    } catch {
      // fall through to markdown paragraphs
    }
  }
  const tables = tablesFromMarkdown(doc.markdown);
  if (tables.length) {
    const sheets = tables.map((table) => ({
      name: table.sheet ?? filename,
      rows: table.rows.map((cells, index) => ({
        cells: cells.map(prettyCell),
        hit: index === 1,
      })),
    }));
    return {
      filename,
      kind: "sheet",
      sheet: sheets[0]?.name,
      sheets,
      rows: sheets[0]?.rows,
    };
  }
  return {
    filename,
    kind: "text",
    paragraphs: paragraphsFromMarkdown(doc.markdown),
    excerpt: excerptText(doc.markdown),
  };
}

export function resolveDealSource(deal: Deal, filename: string): string | null {
  const known = deal.docs.some((item) => item.filename === filename) || deal.deckFilename === filename;
  if (!known) return null;
  const doc = deal.docs.find((item) => item.filename === filename);
  const candidates = [
    deal.sandbox ? path.join(deal.sandbox.workspace, filename) : "",
    path.join(dealRoot(deal.id), "workspace", filename),
    path.join(dealRoot(deal.id), filename),
    doc?.path ?? "",
  ];
  for (const candidate of candidates) {
    if (candidate && existsSync(candidate)) return path.resolve(candidate);
  }
  return resolveExisting(doc?.path ?? "", filename);
}

export function withEvidence(deal: Deal, flag: Flag): FlagView {
  const deck = flag.metric ? pick(deal.metrics, flag.metric, "deck") : undefined;
  const room = flag.metric
    ? deal.metrics.find((metric) => metric.name === flag.metric && metric.sourceKind !== "deck")
    : undefined;
  const deckValue = flag.deckValue ?? (deck ? formatMetric(deck) : undefined);
  const roomValue = flag.roomValue ?? (room ? formatMetric(room) : undefined);
  const filename = flag.sourceFile ?? room?.citation.filename;
  const sheet = flag.sourceSheet ?? room?.citation.sheet;
  const doc = filename ? deal.docs.find((item) => item.filename === filename) : undefined;

  let source: SourcePreview | undefined;
  if (flag.severity === "unsupported" || flag.severity === "missing") {
    source = {
      filename: filename ?? "data room",
      kind: "missing",
      highlight: deckValue ?? flag.quote,
    };
  } else if (doc) {
    source = previewDoc(doc, flag.metric, roomValue ?? room?.raw, sheet);
  }

  return {
    ...flag,
    deckValue,
    roomValue,
    sourceFile: filename,
    sourceSheet: sheet,
    sourceCitation: flag.sourceCitation || [filename, sheet].filter(Boolean).join(" · "),
    label: (flag.metric && METRIC_LABELS[flag.metric]) || flag.quote || "Finding",
    source,
  };
}
