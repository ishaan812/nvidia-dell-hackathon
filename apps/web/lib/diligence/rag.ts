import { chat, cosine, embed } from "./llm";
import { formatMetric, pick } from "./metrics";
import { modelDisplayName, settings } from "./paths";
import type { AskCitation, AskTurn, Citation, Deal, Metric } from "./types";

export type { AskCitation, AskTurn };

type Chunk = { id: string; text: string; source: string; page?: number; vector?: number[] };

export type AskResult = {
  answer: string;
  sources: string[];
  citations: AskCitation[];
  related: string[];
  model: string;
};

function chunkDoc(filename: string, markdown: string, pageTexts?: Record<number, string>): Chunk[] {
  const parts = markdown.split(/\n{2,}/).map((p) => p.trim()).filter((p) => p.length > 40);
  const chunks: Chunk[] = [];
  let buf = "";
  for (const part of parts) {
    buf = buf ? `${buf}\n\n${part}` : part;
    if (buf.length > 500) {
      chunks.push({
        id: `${filename}:${chunks.length}`,
        text: buf.slice(0, 1200),
        source: filename,
        page: pageFor(pageTexts, buf),
      });
      buf = "";
    }
  }
  if (buf) {
    chunks.push({
      id: `${filename}:${chunks.length}`,
      text: buf.slice(0, 1200),
      source: filename,
      page: pageFor(pageTexts, buf),
    });
  }
  return chunks;
}

function pageFor(pageTexts: Record<number, string> | undefined, text: string): number | undefined {
  if (!pageTexts) return undefined;
  const needle = text.slice(0, 80).replace(/\s+/g, " ").trim();
  if (!needle) return undefined;
  for (const [page, body] of Object.entries(pageTexts)) {
    if (body.includes(needle.slice(0, 40))) return Number(page);
  }
  return undefined;
}

function citeMetric(metric: Metric, n: number): AskCitation {
  return {
    n,
    filename: metric.citation.filename,
    page: metric.citation.page,
    sheet: metric.citation.sheet,
    quote: metric.raw,
    label: citeLabel(metric.citation),
  };
}

function citeLabel(c: Citation): string {
  return [c.filename, c.sheet, c.page ? `p.${c.page}` : "", c.label].filter(Boolean).join(" · ");
}

function relatedFromDeal(deal: Deal, skip?: string): string[] {
  const extras = [
    "What's their real ARR?",
    "Why does runway disagree?",
    "Who owns the company?",
    "What is monthly burn from cash?",
    "Where does the TAM claim come from?",
  ];
  const fromFlags = deal.flags.slice(0, 3).map((flag) => {
    if (flag.metric === "arr") return "How is ARR defined in the room vs the deck?";
    if (flag.metric === "runway_months") return "What runway does cash actually support?";
    if (flag.metric === "headcount") return "How many people are on the cap table vs the deck?";
    if (flag.metric === "founder_ownership_pct") return "What do the founders actually own?";
    if (flag.metric === "tam") return "Is there a source for the TAM?";
    return flag.comment;
  });
  return [...fromFlags, ...extras]
    .filter((item, i, all) => item && item !== skip && all.indexOf(item) === i)
    .slice(0, 3);
}

function metricAnswer(deal: Deal, q: string): AskResult | null {
  const n = q.toLowerCase();
  const want = (name: string): AskResult | null => {
    const room = pick(deal.metrics, name, "financials") ?? pick(deal.metrics, name, "cap_table");
    const deck = pick(deal.metrics, name, "deck");
    if (!room && !deck) return null;
    if (room && deck && room.value !== deck.value) {
      const citations = [citeMetric(room, 1), citeMetric(deck, 2)];
      return finish(
        `The data room says ${formatMetric(room)} (${room.citation.filename}${room.citation.sheet ? `, ${room.citation.sheet}` : ""}) [1]. The deck says ${formatMetric(deck)} [2]. Use the data-room figure.`,
        citations,
        deal,
        q,
      );
    }
    const m = room ?? deck!;
    return finish(
      `${formatMetric(m)}, from ${m.citation.filename}${m.citation.sheet ? ` · ${m.citation.sheet}` : ""} [1].`,
      [citeMetric(m, 1)],
      deal,
      q,
    );
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

function finish(answer: string, citations: AskCitation[], deal: Deal, question: string): AskResult {
  return {
    answer,
    sources: citations.map((c) => c.filename).filter((v, i, a) => a.indexOf(v) === i),
    citations,
    related: relatedFromDeal(deal, question),
    model: modelDisplayName(),
  };
}

function parseRelated(prose: string): { answer: string; related: string[] } {
  const split = prose.split(/\nRELATED\b[:\s]*/i);
  if (split.length < 2) return { answer: prose.trim(), related: [] };
  const related = split[1]
    .split("\n")
    .map((line) => line.replace(/^[-*Q:\d.)\s]+/, "").trim())
    .filter((line) => line.length > 8 && line.length < 140)
    .slice(0, 3);
  return { answer: split[0].trim(), related };
}

export async function answerQuery(
  deal: Deal,
  question: string,
  history: AskTurn[] = [],
): Promise<AskResult> {
  const direct = metricAnswer(deal, question);
  if (direct) return direct;

  const chunks = deal.docs
    .flatMap((d) => chunkDoc(d.filename, d.markdown, d.pageTexts))
    .slice(0, 24);
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

  const citations: AskCitation[] = ranked.map((c, i) => ({
    n: i + 1,
    filename: c.source,
    page: c.page,
    quote: c.text.slice(0, 220),
    label: [c.source, c.page ? `p.${c.page}` : ""].filter(Boolean).join(" · "),
  }));

  const context = ranked
    .map((c, i) => `[${i + 1}] ${c.source}${c.page ? ` p.${c.page}` : ""}\n${c.text}`)
    .join("\n\n");
  const flagNotes = deal.flags.map((f) => `- ${f.severity}: ${f.comment}`).join("\n");
  const prior = history.slice(-6).map((turn) => ({
    role: turn.role,
    content: turn.content,
  }));

  const prose = await chat(
    [
      {
        role: "system",
        content:
          "You are an associate answering a partner about one sealed deal. Use only the supplied context from this deal's files. Cite claims as [1], [2] matching the numbered blocks. If you do not know, say so. After the answer, write RELATED and three short follow-up questions.",
      },
      ...prior,
      {
        role: "user",
        content: `Question: ${question}\n\nFlags:\n${flagNotes}\n\nContext:\n${context}`,
      },
    ],
    { model: settings().diligenceModel },
  );

  const parsed = parseRelated(
    prose ||
      `I could not reach ${settings().llmModel}. From the file set: ${deal.flags[0]?.comment ?? "see the IC memo."}`,
  );

  return {
    answer: parsed.answer,
    sources: citations.map((c) => c.filename).filter((v, i, a) => a.indexOf(v) === i),
    citations,
    related: parsed.related.length ? parsed.related : relatedFromDeal(deal, question),
    model: modelDisplayName(),
  };
}
