import { createHash } from "node:crypto";
import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { toMarkdown } from "@firecrawl/anydoc";
import { ocrPdfPages, pagesNeedOcr } from "./ocr";
import { parsePptx } from "./pptx";
import { applyRoles, kindFromName } from "./roles";
import type { FileRole, IngestedDoc } from "./types";

const OFFICE = new Set([".pdf", ".pptx", ".ppt", ".xlsx", ".xls", ".docx", ".doc", ".csv"]);

async function walkFiles(dir: string): Promise<string[]> {
  const out: string[] = [];
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.name.startsWith(".")) continue;
    if (entry.name.endsWith(".ocr-pages")) continue;
    if (entry.isDirectory()) out.push(...(await walkFiles(full)));
    else if (OFFICE.has(path.extname(entry.name).toLowerCase())) out.push(full);
  }
  return out;
}

async function pdfPageTexts(filePath: string): Promise<Record<number, string>> {
  if (path.extname(filePath).toLowerCase() !== ".pdf") return {};
  try {
    const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");
    const data = new Uint8Array(await readFile(filePath));
    const doc = await getDocument({ data, useSystemFonts: true }).promise;
    const pages: Record<number, string> = {};
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const content = await page.getTextContent();
      pages[i] = content.items
        .map((item) => ("str" in item ? item.str : ""))
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();
    }
    return pages;
  } catch {
    return {};
  }
}

function tagPages(filename: string, pageTexts: Record<number, string>, markdown: string): string {
  const tagged = Object.entries(pageTexts)
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([page, text]) => `<!-- source:${filename} page:${page} -->\n## Slide ${page}\n\n${text}`)
    .join("\n\n");
  if (tagged) return `${tagged}\n\n---\n\n${markdown}`;
  return `<!-- source:${filename} -->\n${markdown}`;
}

export async function ingestFolder(
  folder: string,
  roles: Record<string, FileRole> = {},
): Promise<IngestedDoc[]> {
  const files = await walkFiles(folder);
  const docs: IngestedDoc[] = [];
  for (const filePath of files) {
    const filename = path.basename(filePath);
    const info = await stat(filePath);
    if (!info.isFile()) continue;
    let markdown = "";
    try {
      markdown = await toMarkdown(filePath);
    } catch (error) {
      const code = (error as { code?: string }).code;
      if (code === "needsOcr") {
        markdown = `<!-- unreadable scanned pages in ${filename} -->`;
      } else {
        markdown = `<!-- parse error ${filename}: ${(error as Error).message} -->`;
      }
    }
    let pageTexts = await pdfPageTexts(filePath);
    let pageWords: IngestedDoc["pageWords"];
    if (path.extname(filePath).toLowerCase() === ".pptx") {
      try {
        const slides = await parsePptx(await readFile(filePath));
        pageTexts = Object.fromEntries(slides.map((slide) => [slide.n, slide.text]));
      } catch {
        // keep anydoc markdown
      }
    }
    if (path.extname(filePath).toLowerCase() === ".pdf" && pagesNeedOcr(pageTexts)) {
      const ocr = await ocrPdfPages(filePath);
      if (Object.keys(ocr.pages).length) {
        pageTexts = ocr.pages;
        pageWords = ocr.words;
      }
    }
    const kind = kindFromName(filename);
    const docId = createHash("sha1").update(filePath).digest("hex").slice(0, 12);
    docs.push({
      docId,
      filename,
      kind,
      role: kind === "deck" ? "deck" : "room",
      path: path.resolve(filePath),
      markdown: tagPages(filename, pageTexts, markdown),
      pageTexts,
      pageWords,
    });
  }
  applyRoles(docs, roles);
  return docs;
}
