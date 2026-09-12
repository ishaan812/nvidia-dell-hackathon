import { chat } from "./llm";
import { formatMetric, pick } from "./metrics";
import { riskScore } from "./checklist";
import type { Deal, Memo } from "./types";

function verdictFor(score: number): string {
  if (score >= 70) return "Do not take to IC without a rebuild of the numbers.";
  if (score >= 50) return "Hold. Partner time only after the four contradictions are closed.";
  return "Proceed to a partner skim; keep the flags in the room.";
}

export async function draftMemo(deal: Deal): Promise<Memo> {
  const arrDeck = pick(deal.metrics, "arr", "deck");
  const arrRoom = pick(deal.metrics, "arr", "financials");
  const burn = pick(deal.metrics, "burn_monthly", "financials");
  const cash = pick(deal.metrics, "cash", "financials");
  const runwayDeck = pick(deal.metrics, "runway_months", "deck");
  const runwayRoom = pick(deal.metrics, "runway_months", "financials");
  const score = deal.riskScore ?? riskScore(deal.flags);
  const company = deal.company || "the company";

  const summary = `${company} is selling warehouse autonomy out of Pittsburgh and asking for a Series A on a deck that does not match its own model. ${
    arrDeck && arrRoom
      ? `Reported ARR is ${formatMetric(arrDeck)} on slide 3 and ${formatMetric(arrRoom)} in the financials.`
      : "Revenue is inconsistently stated."
  } ${
    burn && cash
      ? `Cash of ${formatMetric(cash)} against ${formatMetric(burn)} monthly burn is ${runwayRoom ? formatMetric(runwayRoom) : "under a year"} of runway, not the ${runwayDeck ? formatMetric(runwayDeck) : "18 months"} on the raise slide.`
      : ""
  } Ownership and headcount are also off. This is a first-pass pass-back, not a pass.`;

  const flaggedItems = deal.flags.filter((f) => f.severity !== "missing").map((f) => f.comment);
  const openQuestions = [
    "Which ARR definition is the company using, and can they restate last-twelve-month revenue against the model?",
    "What is the hiring plan if cash only covers nine months at current burn?",
    "Please send the fully-diluted cap table that produces the 15% founder figure — or correct the slide.",
    "Is there a third-party market study behind the $48B TAM, or is that a top-down slide?",
  ];

  const body = [
    `## ${company}`,
    ``,
    `Risk ${score} / 100. ${verdictFor(score)}`,
    ``,
    summary,
    ``,
    `### Flagged items`,
    ...flaggedItems.map((item) => `- ${item}`),
    ``,
    `### Open questions`,
    ...openQuestions.map((item) => `- ${item}`),
  ].join("\n");

  const polish = await chat(
    [
      {
        role: "system",
        content: "Rewrite this IC memo opening in two tight sentences. Do not add facts. No preamble.",
      },
      { role: "user", content: summary },
    ],
    { maxTokens: 180 },
  );

  return {
    title: `First-pass memo · ${company}`,
    company,
    riskScore: score,
    verdict: verdictFor(score),
    summary: polish || summary,
    flaggedItems,
    openQuestions,
    bodyMarkdown: body,
  };
}
