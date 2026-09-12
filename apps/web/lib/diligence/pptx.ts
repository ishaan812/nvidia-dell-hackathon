import JSZip from "jszip";

export type PptxSlide = {
  n: number;
  kicker: string;
  title: string;
  lines: string[];
  text: string;
};

function decode(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function isChrome(line: string): boolean {
  return /investor materials|confidential|pre-seed\s*\/\s*seed|investor pitch deck/i.test(line);
}

function isPageNum(line: string): boolean {
  return /^\d{1,2}$/.test(line);
}

export async function parsePptx(bytes: Buffer | Uint8Array): Promise<PptxSlide[]> {
  const zip = await JSZip.loadAsync(bytes);
  const names = Object.keys(zip.files)
    .filter((name) => /^ppt\/slides\/slide\d+\.xml$/i.test(name))
    .sort((a, b) => Number(a.match(/\d+/)?.[0] ?? 0) - Number(b.match(/\d+/)?.[0] ?? 0));

  const slides: PptxSlide[] = [];
  for (const name of names) {
    const file = zip.file(name);
    if (!file) continue;
    const xml = await file.async("string");
    const raw = [...xml.matchAll(/<a:t[^>]*>([^<]*)<\/a:t>/g)]
      .map((match) => decode(match[1]))
      .filter(Boolean);
    const n = Number(name.match(/slide(\d+)/i)?.[1] ?? slides.length + 1);
    const useful = raw.filter((line) => !isChrome(line) && !isPageNum(line));
    const kicker = useful[0] && useful[0].length <= 18 ? useful[0] : "";
    const rest = kicker ? useful.slice(1) : useful;
    const title = rest[0] ?? `Slide ${n}`;
    const lines = rest.slice(1);
    slides.push({
      n,
      kicker,
      title,
      lines,
      text: raw.join(" "),
    });
  }
  return slides;
}
