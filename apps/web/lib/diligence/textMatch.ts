export type TextRun = {
  str: string;
  transform: number[];
  width: number;
  height?: number;
};

export function quoteNeedles(quote: string): string[] {
  const q = quote.replace(/\s+/g, " ").trim();
  if (!q) return [];
  const needles = [q];
  const patterns = [
    /\$[0-9][0-9.,]*\s*[MmBbKk]?\s*(?:ARR|TAM)/i,
    /\$[0-9][0-9.,]*\s*[MmBbKk]/i,
    /[0-9]+(?:\.[0-9]+)?\s*months?(?:\s+of\s+runway)?/i,
    /[0-9]+\s*people/i,
    /Founders?\s+[0-9]+(?:\.[0-9]+)?\s*%/i,
    /[0-9]+(?:\.[0-9]+)?\s*%/,
    />?\s*[0-9]+(?:\.[0-9]+)?\s*(?:\+|%|x|bn|m|k)?/i,
  ];
  for (const re of patterns) {
    const match = q.match(re);
    if (match) needles.push(match[0]);
  }
  return [...new Set(needles.map((n) => n.replace(/\s+/g, " ").trim()))].sort((a, b) => b.length - a.length);
}

function norm(s: string) {
  return s.toLowerCase().replace(/\s+/g, " ").trim();
}

function packed(s: string) {
  return s.toLowerCase().replace(/\s+/g, "");
}

export function findRunIndexes(runs: { str: string }[], quote: string): number[] {
  const needles = quoteNeedles(quote);
  for (const needle of needles) {
    for (let i = 0; i < runs.length; i++) {
      let acc = "";
      const used: number[] = [];
      for (let j = i; j < Math.min(runs.length, i + 14); j++) {
        const piece = runs[j].str;
        if (!piece.trim()) continue;
        acc = `${acc} ${piece}`.replace(/\s+/g, " ").trim();
        used.push(j);
        if (norm(acc).includes(norm(needle)) || packed(acc).includes(packed(needle))) {
          while (used.length > 1) {
            const rest = used
              .slice(1)
              .map((idx) => runs[idx].str)
              .join(" ");
            if (norm(rest).includes(norm(needle)) || packed(rest).includes(packed(needle))) {
              used.shift();
            } else break;
          }
          return used;
        }
      }
    }
  }
  return [];
}

export function clipFactor(str: string, quote: string): { start: number; end: number } {
  const packedStr = packed(str);
  if (!packedStr) return { start: 0, end: 1 };
  const needles = [...quoteNeedles(quote)].reverse();
  for (const needle of needles) {
    const idx = packedStr.indexOf(packed(needle));
    if (idx >= 0) {
      return { start: idx / packedStr.length, end: (idx + packed(needle).length) / packedStr.length };
    }
  }
  return { start: 0, end: 1 };
}

export function findOcrBox(
  words: { t: string; x: number; y: number; w: number; h: number }[],
  quote: string,
): { x: number; y: number; w: number; h: number } | null {
  if (!quote.trim() || !words.length) return null;
  const runs = words.map((word) => ({ str: word.t }));
  const indexes = findRunIndexes(runs, quote);
  if (!indexes.length) return null;
  const used = indexes.map((i) => words[i]);
  const x = Math.min(...used.map((word) => word.x));
  const y = Math.min(...used.map((word) => word.y));
  const right = Math.max(...used.map((word) => word.x + word.w));
  const bottom = Math.max(...used.map((word) => word.y + word.h));
  const padX = 0.01;
  const padY = 0.012;
  return {
    x: Math.max(0, x - padX),
    y: Math.max(0, y - padY),
    w: Math.min(1, right - x + padX * 2),
    h: Math.min(1, bottom - y + padY * 2),
  };
}

export function pdfRunBox(run: TextRun, quote?: string) {
  const t = run.transform;
  const height = Math.abs(t[3]) || run.height || 12;
  const width = run.width || Math.abs(t[0]) * (run.str.length || 1);
  const clip = quote ? clipFactor(run.str, quote) : { start: 0, end: 1 };
  return {
    x: t[4] + width * clip.start,
    y: t[5],
    width: Math.max(18, width * (clip.end - clip.start)),
    height,
  };
}
