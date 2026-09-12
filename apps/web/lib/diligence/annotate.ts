import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import { resolveExisting } from "./files";
import { findRunIndexes, pdfRunBox, type TextRun } from "./textMatch";
import type { Deal } from "./types";

const FILL = {
  contradiction: rgb(0.96, 0.72, 0.28),
  unsupported: rgb(0.93, 0.82, 0.4),
  missing: rgb(0.75, 0.78, 0.82),
};

const INK = {
  contradiction: rgb(0.706, 0.137, 0.094),
  unsupported: rgb(0.604, 0.404, 0),
  missing: rgb(0.4, 0.44, 0.52),
};

function wrap(text: string, width: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (next.length > width) {
      if (line) lines.push(line);
      line = word;
    } else line = next;
  }
  if (line) lines.push(line);
  return lines.slice(0, 5);
}

export async function annotateDeck(deal: Deal, outDir: string): Promise<string | null> {
  const deck =
    deal.docs.find((d) => d.filename === deal.deckFilename && (d.role === "deck" || d.kind === "deck") && /\.pdf$/i.test(d.filename)) ??
    deal.docs.find((d) => (d.role === "deck" || d.kind === "deck") && /\.pdf$/i.test(d.path || d.filename));
  if (!deck) return null;
  const src = resolveExisting(deck.path, deck.filename);
  if (!src) return null;
  await mkdir(outDir, { recursive: true });
  const dest = path.join(outDir, "deck.annotated.pdf");
  const bytes = await readFile(src);
  const pdf = await PDFDocument.load(bytes);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const reader = await getDocument({ data: new Uint8Array(bytes), useSystemFonts: true }).promise;

  for (const flag of deal.flags) {
    if (!flag.page) continue;
    const page = pdf.getPage(flag.page - 1);
    if (!page) continue;
    const { width, height } = page.getSize();
    const view = await reader.getPage(flag.page);
    const items = (await view.getTextContent()).items.filter(
      (item): item is TextRun => "str" in item && "transform" in item,
    );
    const hits = findRunIndexes(items, flag.quote).map((i) => pdfRunBox(items[i], flag.quote));
    const color = FILL[flag.severity];
    const ink = INK[flag.severity];
    if (hits.length) {
      for (const box of hits) {
        page.drawRectangle({
          x: box.x - 2,
          y: box.y - 3,
          width: box.width + 4,
          height: box.height + 6,
          color,
          opacity: 0.45,
        });
      }
    } else {
      page.drawRectangle({ x: 0, y: 0, width: 8, height, color: ink, opacity: 0.9 });
    }
    const head = hits[0] ?? { x: 56, y: height - 80, width: 120, height: 18 };
    const note = wrap(`${flag.severity} — ${flag.comment}`, 42);
    const boxH = 14 + note.length * 9;
    const boxW = 230;
    const nx = Math.min(width - boxW - 16, head.x + head.width + 12);
    const ny = Math.max(16, head.y - 4);
    page.drawRectangle({
      x: nx,
      y: ny - boxH + 12,
      width: boxW,
      height: boxH,
      color: rgb(0.97, 0.94, 0.89),
      opacity: 0.96,
      borderColor: ink,
      borderWidth: 0.8,
    });
    note.forEach((line, i) => {
      page.drawText(line, {
        x: nx + 6,
        y: ny - 2 - i * 9,
        size: 7,
        font: i === 0 ? bold : font,
        color: rgb(0.12, 0.14, 0.18),
      });
    });
  }

  await writeFile(dest, await pdf.save());
  await copyFile(src, path.join(outDir, path.basename(src)));
  return dest;
}
