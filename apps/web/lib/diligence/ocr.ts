import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import type { OcrWord } from "./types";

const exec = promisify(execFile);
const CACHE_VERSION = 3;

export type OcrResult = {
  pages: Record<number, string>;
  words: Record<number, OcrWord[]>;
};

function bin(name: string): string | null {
  for (const dir of ["/opt/homebrew/bin", "/usr/local/bin", "/usr/bin"]) {
    const full = path.join(dir, name);
    if (existsSync(full)) return full;
  }
  return null;
}

export function pagesNeedOcr(pages: Record<number, string>): boolean {
  const values = Object.values(pages);
  if (!values.length) return true;
  return values.every((text) => text.replace(/\s+/g, "").length < 8);
}

function pngSize(bytes: Buffer): { w: number; h: number } {
  if (bytes.length < 24 || bytes.toString("ascii", 1, 4) !== "PNG") return { w: 1, h: 1 };
  return { w: bytes.readUInt32BE(16) || 1, h: bytes.readUInt32BE(20) || 1 };
}

function scoreOcr(text: string): number {
  const nums = (text.match(/\d+/g) ?? []).length;
  return text.length + nums * 8;
}

function parseTsv(tsv: string, imgW: number, imgH: number): OcrWord[] {
  const words: OcrWord[] = [];
  for (const line of tsv.split(/\r?\n/).slice(1)) {
    const cols = line.split("\t");
    if (cols.length < 12) continue;
    const level = Number(cols[0]);
    const left = Number(cols[6]);
    const top = Number(cols[7]);
    const width = Number(cols[8]);
    const height = Number(cols[9]);
    const conf = Number(cols[10]);
    const text = cols.slice(11).join(" ").trim();
    if (level !== 5 || !text || conf < 20) continue;
    if (![left, top, width, height].every(Number.isFinite)) continue;
    words.push({
      t: text,
      x: left / imgW,
      y: top / imgH,
      w: width / imgW,
      h: height / imgH,
    });
  }
  return words;
}

async function tesseractText(tesseract: string, png: string, psm: string): Promise<string> {
  try {
    const { stdout } = await exec(tesseract, [png, "stdout", "-l", "eng", "--psm", psm]);
    return stdout.replace(/\s+/g, " ").trim();
  } catch {
    return "";
  }
}

async function tesseractWords(tesseract: string, png: string, psm: string, imgW: number, imgH: number): Promise<OcrWord[]> {
  try {
    const { stdout } = await exec(tesseract, [png, "stdout", "-l", "eng", "--psm", psm, "tsv"]);
    return parseTsv(stdout, imgW, imgH);
  } catch {
    return [];
  }
}

export async function ocrPdfPages(filePath: string): Promise<OcrResult> {
  const magick = bin("magick");
  const tesseract = bin("tesseract");
  if (!magick || !tesseract) return { pages: {}, words: {} };

  const info = await stat(filePath);
  const cache = `${filePath}.ocr.json`;
  if (existsSync(cache)) {
    try {
      const saved = JSON.parse(await readFile(cache, "utf8")) as {
        version?: number;
        mtime: number;
        pages: Record<number, string>;
        words?: Record<number, OcrWord[]>;
      };
      if (
        saved.version === CACHE_VERSION &&
        saved.mtime === info.mtimeMs &&
        saved.pages &&
        Object.keys(saved.pages).length
      ) {
        return { pages: saved.pages, words: saved.words ?? {} };
      }
    } catch {
      // redo
    }
  }

  const work = `${filePath}.ocr-pages`;
  await mkdir(work, { recursive: true });
  const pages: Record<number, string> = {};
  const words: Record<number, OcrWord[]> = {};
  for (let page = 1; page <= 24; page++) {
    const png = path.join(work, `p-${page}.png`);
    try {
      await exec(magick, [
        "-density",
        "180",
        `${filePath}[${page - 1}]`,
        "-alpha",
        "off",
        "-depth",
        "8",
        "-colorspace",
        "sRGB",
        "-normalize",
        png,
      ]);
    } catch {
      break;
    }
    if (!existsSync(png)) break;
    const size = pngSize(await readFile(png));
    const reads = await Promise.all(
      ["4", "6", "11"].map(async (psm) => ({ psm, text: await tesseractText(tesseract, png, psm) })),
    );
    const best = reads.sort((a, b) => scoreOcr(b.text) - scoreOcr(a.text))[0];
    pages[page] = best?.text ?? "";
    words[page] = best ? await tesseractWords(tesseract, png, best.psm, size.w, size.h) : [];
  }

  if (Object.values(pages).some((text) => text.length > 8)) {
    await writeFile(cache, JSON.stringify({ version: CACHE_VERSION, mtime: info.mtimeMs, pages, words }));
  }
  return { pages, words };
}
