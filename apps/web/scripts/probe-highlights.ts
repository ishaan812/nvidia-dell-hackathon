import { readFile } from "node:fs/promises";
import path from "node:path";
import { dirs } from "../lib/diligence/paths";
import { findRunIndexes, quoteNeedles } from "../lib/diligence/textMatch";

const quotes = ["$4.2M ARR", "18 months of runway", "40 people", "Founders 15%", "$48B TAM"];

async function main() {
  const file = path.join(dirs().sample, "northstar-deck.pdf");
  const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const pdf = await getDocument({ data: new Uint8Array(await readFile(file)), useSystemFonts: true }).promise;
  for (let n = 1; n <= pdf.numPages; n++) {
    const page = await pdf.getPage(n);
    const items = (await page.getTextContent()).items.filter((i): i is { str: string; transform: number[]; width: number } => "str" in i);
    console.log(`\nPAGE ${n}`);
    console.log(items.map((i) => JSON.stringify(i.str)).join(" | "));
    for (const q of quotes) {
      const hits = findRunIndexes(items, q);
      if (hits.length) {
        console.log(
          "  match",
          q,
          "->",
          hits.map((i) => ({
            str: items[i].str,
            w: items[i].width,
            t: items[i].transform.map((n) => Math.round(n * 10) / 10),
          })),
        );
      }
    }
  }
}

main();
