import { chat, cosine, embed } from "./llm";
import { formatMetric, pick } from "./metrics";
import type { Deal } from "./types";

type Chunk = { id: string; text: string; source: string; vector?: number[] };

function chunkDoc(filename: string, markdown: string): Chunk[] {
  const parts = markdown.split(/\n{2,}/).map((p) => p.trim()).filter((p) => p.length > 40);
  const chunks: Chunk[] = [];
  let buf = "";
  for (const part of parts) {
    buf = buf ? `${buf}\n\n${part}` : part;
    if (buf.length > 500) {
      chunks.push({ id: `${filename}:${chunks.length}`, text: buf.slice(0, 1200), source: filename });
      buf = "";
    }
  }
  if (buf) chunks.push({ id: `${filename}:${chunks.length}`, text: buf.slice(0, 1200), source: filename });
  return chunks;
}

function metricAnswer(deal: Deal, q: string): string | null {
  const n = q.toLowerCase();
  const want = (name: string) => {
    const room = pick(deal.metrics, name, "financials") ?? pick(deal.metrics, name, "cap_table");
    const deck = pick(deal.metrics, name, "deck");
    if (!room && !deck) return null;
    if (room && deck && room.value !== deck.value) {
      return `The data room says ${formatMetric(room)} (${room.citation.filename}${room.citation.sheet ? `, ${room.citation.sheet}` : ""}). The deck says ${formatMetric(deck)}. Use the data-room figure.`;
    }
    const m = room ?? deck!;
    return `${formatMetric(m)}, from ${m.citation.filename}${m.citation.sheet ? ` · ${m.citation.sheet}` : ""}.`;
  };
  if (/burn/.test(n)) return want("burn_monthly");
  if (/runway/.test(n)) return want("runway_months");
  if (/arr|revenue/.test(n)) return want("arr");
  if (/headcount|employee|team/.test(n)) return want("headcount");
  if (/owner|dilut|founder/.test(n)) return want("founder_ownership_pct");
  if (/cash/.test(n)) return want("cash");
  if (/nrr|retention/.test(n)) return want("nrr");
  return null;
}

export async function answerQuery(deal: Deal, question: string): Promise<{ answer: string; sources: string[] }> {
  const direct = metricAnswer(deal, question);
  if (direct) {
    return { answer: direct, sources: deal.metrics.map((m) => m.citation.filename).filter((v, i, a) => a.indexOf(v) === i) };
  }

  const chunks = deal.docs.flatMap((d) => chunkDoc(d.filename, d.markdown)).slice(0, 24);
  let ranked = chunks;
  try {
    const [qVec, ...vecs] = await embed([question, ...chunks.map((c) => c.text)]);
    ranked = chunks
      .map((c, i) => ({ ...c, vector: vecs[i], score: cosine(qVec, vecs[i]) }))
      .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
      .slice(0, 4);
  } catch {
    ranked = chunks.slice(0, 4);
  }

  const context = ranked.map((c) => `[${c.source}]\n${c.text}`).join("\n\n");
  const flagNotes = deal.flags.map((f) => `- ${f.severity}: ${f.comment}`).join("\n");
  const prose = await chat([
    {
      role: "system",
      content:
        "You are an associate answering a partner about one sealed deal. Use only the supplied context from this deal's files. Cite the filename. If you do not know, say so.",
    },
    {
      role: "user",
      content: `Question: ${question}\n\nFlags:\n${flagNotes}\n\nContext:\n${context}`,
    },
  ]);

  const answer =
    prose ||
    `I could not reach the local model. From the file set: ${deal.flags[0]?.comment ?? "see the IC memo."}`;
  return { answer, sources: ranked.map((c) => c.source) };
}
