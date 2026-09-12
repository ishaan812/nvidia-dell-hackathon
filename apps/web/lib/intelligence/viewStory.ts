import type { DealSummary, Flag } from "../diligence/types";
import type { DealIntelligence, ScoreChange, ScoreKey, TimelineEvent } from "./types";
import { clampScore, effectiveScores } from "./scores";

export type Actor = "you" | "founder" | "agent" | "external";

export const ACTOR_LABEL: Record<Actor, string> = {
  you: "You",
  founder: "Founder",
  agent: "Agent",
  external: "External",
};

export function band(kind: "conviction" | "risk" | "evidence", value?: number): string {
  if (value == null) return "Not scored";
  if (kind === "risk") {
    if (value >= 70) return "High";
    if (value >= 50) return "Elevated";
    return "Low";
  }
  if (value >= 70) return "Strong";
  if (value >= 45) return "Moderate";
  return kind === "evidence" ? "Thin" : "Weak";
}

export function scoreTone(value?: number): "good" | "mid" | "weak" | "empty" {
  if (value == null) return "empty";
  if (value >= 70) return "good";
  if (value >= 45) return "mid";
  return "weak";
}

export function scoreBand(value?: number): string {
  if (value == null) return "Not scored";
  if (value >= 70) return "Strong";
  if (value >= 45) return "Moderate";
  return "Weak";
}

export function headerScores(intel: DealIntelligence, flags: Flag[]) {
  const scores = effectiveScores(intel);
  const team = intel.scoreBreakdown?.opportunity?.team ?? scores.opportunityQuality ?? 50;
  const capHit = flags.some((flag) => flag.metric === "founder_ownership_pct" && flag.severity === "contradiction");
  const conviction = clampScore(team * 0.65 + (capHit ? 28 : 78) * 0.35);
  const contradictions = flags.filter((flag) => flag.severity === "contradiction").length;
  const unsupported = flags.filter((flag) => flag.severity === "unsupported").length;
  const diligence = clampScore(88 - contradictions * 10 - unsupported * 6);
  return [
    {
      key: "thesis",
      label: "Thesis fit",
      value: intel.thesis.score ?? scores.thesisFit,
      note: "Where this company sits on the fund lens.",
    },
    {
      key: "conviction",
      label: "Conviction",
      value: conviction,
      note: "Founder–market fit and who is on the cap table.",
    },
    {
      key: "opportunity",
      label: "Opportunity",
      value: scores.opportunityQuality,
      note: "Market size, open space, and competitors.",
    },
    {
      key: "diligence",
      label: "Due diligence",
      value: diligence,
      note: "Financials and deck versus data-room discrepancies.",
    },
  ] as const;
}

export function thesisBrief(intel: DealIntelligence): string {
  const { profile, thesis } = intel;
  const hits = thesis.matches.map((item) => item.label.toLowerCase());
  const stretch = [...thesis.mismatches, ...thesis.exceptions].map((item) => item.label.toLowerCase());
  const product = profile.product ? profile.product.replace(/\.$/, "") : profile.company;
  const line1 = `${product} — ${profile.sector}, ${profile.stage}, ${profile.geography}.`;
  const line2 = hits.length
    ? `It touches the thesis on ${hits.join(", ")}.`
    : "It does not yet sit on a preferred thesis filter.";
  const line3 = stretch.length
    ? `The stretch is ${stretch.join(", ")}.`
    : "No thesis exception is flagged.";
  return `${line1} ${line2} ${line3}`;
}

export function thesisChecks(intel: DealIntelligence) {
  return [
    ...intel.thesis.matches.map((item) => ({ ...item, on: true })),
    ...intel.thesis.mismatches.map((item) => ({ ...item, on: false })),
    ...intel.thesis.exceptions.map((item) => ({ ...item, on: false })),
  ];
}

export function thesisFitBand(value?: number, exceptions = 0): string {
  if (exceptions) return "Thesis exception";
  if (value == null) return "Not scored";
  if (value >= 75) return "Strong thesis fit";
  if (value >= 55) return "Moderate thesis fit";
  if (value >= 40) return "Weak thesis fit";
  return "Outside usual preference";
}

export function plainMetric(name?: string): string {
  const key = (name ?? "").toLowerCase();
  if (key === "arr" || /arr|revenue/.test(key)) return "Annual Recurring Revenue";
  if (/runway/.test(key)) return "Runway";
  if (/headcount|employee/.test(key)) return "Headcount";
  if (/owner|dilut/.test(key)) return "Founder ownership";
  if (/tam|total market/.test(key)) return "Total Market Size";
  if (/sam|reachable/.test(key)) return "Reachable Market Size";
  if (/burn/.test(key)) return "Monthly burn";
  if (/nrr|retention/.test(key)) return "Net revenue retention";
  if (/cac/.test(key)) return "Customer Acquisition Cost";
  if (/ltv/.test(key)) return "Customer Lifetime Value";
  return name || "Claim";
}

export function lastConvictionMove(intel: DealIntelligence): ScoreChange | undefined {
  return [...intel.scoreChanges].reverse().find((item) => item.key === "investmentConviction");
}

export function gaugeDetail(intel: DealIntelligence, key: ScoreKey) {
  const scores = effectiveScores(intel);
  const history = intel.scoreChanges.filter((item) => item.key === key);
  const last = history[history.length - 1];
  return {
    current: scores[key],
    previous: last?.previous ?? null,
    reason: last?.reason ?? intel.scoreBreakdown?.convictionNote,
    evidence: last?.evidence,
    date: last?.date,
  };
}

export function currentView(intel: DealIntelligence) {
  const scores = effectiveScores(intel);
  const like =
    intel.findings.find((item) => item.kind === "strength")?.body ??
    intel.ic?.opportunityQuality ??
    intel.profile.product;
  const concern =
    intel.risks.find((item) => item.status === "open" && item.materiality !== "low")?.description ??
    intel.findings.find((item) => item.kind === "contradiction" || item.kind === "risk")?.body ??
    intel.ic?.risks;
  const unresolved =
    intel.questions.find((item) => item.status === "open" || item.status === "asked")?.question ??
    intel.ic?.openQuestions[0];
  const evidenceNote =
    scores.investmentConviction != null && (scores.evidenceConfidence ?? 0) < 50
      ? "The company looks attractive, but the evidence base is still incomplete."
      : intel.ic?.evidenceConfidence ??
        (scores.evidenceConfidence != null
          ? `Evidence confidence is ${band("evidence", scores.evidenceConfidence).toLowerCase()}.`
          : "Evidence has not been scored yet.");
  return {
    like,
    concern,
    evidence: evidenceNote,
    unresolved,
    next: intel.nextAction.title,
    whyNext: intel.nextAction.reason,
  };
}

export type AttentionItem = {
  id: string;
  what: string;
  why: string;
  who: string;
  next: string;
};

export function attentionItems(intel: DealIntelligence): AttentionItem[] {
  const items: AttentionItem[] = [];
  if (intel.pendingGate) {
    items.push({
      id: `gate-${intel.pendingGate.id}`,
      what: intel.pendingGate.prompt,
      why: "The desk is waiting on a person before it moves the deal.",
      who: intel.pendingGate.id === "founder" ? "Founder" : "You",
      next: intel.pendingGate.options[0] ?? intel.nextAction.title,
    });
  }
  for (const task of intel.tasks.filter((item) => item.status !== "done" && item.kind !== "internal")) {
    if (items.length >= 3) break;
    if (items.some((row) => row.what === task.title)) continue;
    items.push({
      id: task.id,
      what: task.title,
      why: task.waitingOn ? `Still waiting on ${task.waitingOn}.` : intel.nextAction.reason,
      who: task.waitingOn ? task.waitingOn : task.owner,
      next: task.status === "waiting" ? "Receive the outstanding item" : "Do this next",
    });
  }
  if (!items.length && intel.nextAction.urgency === "now") {
    items.push({
      id: "next",
      what: intel.nextAction.title,
      why: intel.nextAction.reason,
      who: "You",
      next: intel.nextAction.title,
    });
  }
  return items.slice(0, 3);
}

export function materialChanges(intel: DealIntelligence) {
  const changes = intel.scoreChanges
    .filter((item) => item.previous != null && item.next != null && Math.abs((item.next ?? 0) - (item.previous ?? 0)) >= 3)
    .slice(-4)
    .reverse()
    .map((item) => ({
      id: item.id,
      text: item.reason,
      delta: (item.next ?? 0) - (item.previous ?? 0),
      up: (item.next ?? 0) >= (item.previous ?? 0),
    }));
  if (changes.length) return changes;
  return intel.timeline.slice(-3).reverse().map((event) => ({
    id: event.id,
    text: event.body || event.title,
    delta: 0,
    up: !/unresolved|unsupported|flag|discrepan/i.test(`${event.title} ${event.body}`),
  }));
}

export function actorOf(event: TimelineEvent): Actor {
  const blob = `${event.source ?? ""} ${event.title} ${event.body}`.toLowerCase();
  if (/founder|maya|owen|uploaded|reply/.test(blob)) return "founder";
  if (/you|partner|requested|investment team|ic /.test(blob)) return "you";
  if (/inbound|scout|carrier|external|reference|portco/.test(blob)) return "external";
  return "agent";
}

export function storyLine(event: TimelineEvent): { actor: Actor; what: string; impact: string; at: string } {
  const actor = actorOf(event);
  const raw = `${event.title} ${event.body}`;
  let what = event.title;
  if (/reply applied|arr restated/i.test(raw)) what = "Restated how Annual Recurring Revenue is counted.";
  else if (/conviction updated|conviction \d/i.test(raw)) what = event.body || "Updated investment conviction after new evidence.";
  else if (/data room reconciled|inconsistenc/i.test(raw)) what = "Found inconsistencies between the deck and the data room.";
  else if (/analysis completed/i.test(raw)) what = "Finished the checks this new file could change.";
  else if (event.body && event.body.length < 140) what = event.body;
  return { actor, what, impact: event.body, at: event.at };
}

export type DiscrepancyGroup = {
  id: string;
  issue: string;
  findings: {
    id: string;
    metric: string;
    deck?: string;
    room?: string;
    comment: string;
    source?: string;
  }[];
};

export function groupDiscrepancies(flags: Flag[]): DiscrepancyGroup[] {
  const money = flags.filter((flag) =>
    /arr|runway|headcount|owner|tam|burn|cash|revenue/i.test(`${flag.metric ?? ""} ${flag.comment}`),
  );
  const other = flags.filter((flag) => !money.includes(flag));
  const groups: DiscrepancyGroup[] = [];
  if (money.length) {
    groups.push({
      id: "financial-reporting",
      issue: "Financial reporting inconsistency",
      findings: money.map(toFinding),
    });
  }
  if (other.length) {
    groups.push({
      id: "other-flags",
      issue: "Other unsupported or missing claims",
      findings: other.map(toFinding),
    });
  }
  return groups;
}

function toFinding(flag: Flag) {
  return {
    id: flag.id,
    metric: plainMetric(flag.metric),
    deck: flag.deckValue,
    room: flag.roomValue,
    comment: flag.comment,
    source: flag.sourceCitation || flag.sourceFile,
  };
}

export function pendingItems(intel: DealIntelligence) {
  return intel.tasks.filter((task) => task.status !== "done" && (task.kind === "document" || task.status === "waiting"));
}

export function openQuestions(intel: DealIntelligence) {
  return intel.questions.filter((item) => item.status === "open" || item.status === "asked");
}

export function founderDraft(flags: Flag[]): string {
  const lines = flags
    .filter((flag) => flag.severity === "contradiction" || flag.severity === "unsupported")
    .map((flag) => {
      if (flag.deckValue && flag.roomValue) {
        return `• ${plainMetric(flag.metric)} — deck ${flag.deckValue}, room ${flag.roomValue}`;
      }
      return `• ${flag.comment}`;
    });
  return [
    "Hi —",
    "",
    "Before we take this further I need one note that walks the same numbers in the deck and the data room.",
    "",
    ...lines,
    "",
    "A short restatement of how you count Annual Recurring Revenue, runway, headcount, and founder ownership would close this.",
    "",
    "Thanks",
  ].join("\n");
}

export function responseMap(intel: DealIntelligence, flags: Flag[]) {
  return flags.map((flag) => {
    const metric = plainMetric(flag.metric);
    if (!intel.founderReplyApplied) {
      return { id: flag.id, metric, status: "Open" as const };
    }
    if (flag.metric === "arr") return { id: flag.id, metric, status: "Partially resolved" as const };
    if (flag.metric === "runway_months" || flag.metric === "tam") {
      return { id: flag.id, metric, status: "Still open" as const };
    }
    return { id: flag.id, metric, status: "Resolved" as const };
  });
}

export type PipelineBucket = "attention" | "review" | "waiting" | "updated";

export function pipelineBucket(deal: DealSummary): PipelineBucket {
  if (deal.pendingGate || deal.live) return "attention";
  if (deal.nextAction?.toLowerCase().includes("waiting")) return "waiting";
  if (deal.stage === "decision_room") return "review";
  if (deal.stage === "validation" && (deal.flagCounts.contradiction ?? 0) > 0) return "review";
  return "updated";
}

export function decisionCopy(intel: DealIntelligence) {
  const view = currentView(intel);
  const like = intel.ic?.bullCase ?? intel.findings.filter((item) => item.kind === "strength").map((item) => item.body);
  const concern = intel.ic?.bearCase ?? intel.risks.filter((item) => item.status === "open").map((item) => item.description);
  const unknown = intel.ic?.openQuestions?.length ? intel.ic.openQuestions : intel.questions.filter((q) => q.status !== "closed").map((q) => q.question);
  const change = intel.ic?.keyAssumptions?.length
    ? intel.ic.keyAssumptions
    : ["A clean restatement of the numbers", "Independent customer evidence"];
  return {
    view,
    like: Array.isArray(like) ? like : [like],
    concern: Array.isArray(concern) ? concern.filter(Boolean) : [concern].filter(Boolean),
    unknown,
    change,
    next: intel.ic?.nextBestAction ?? intel.nextAction.title,
    why: intel.nextAction.reason,
  };
}

export function supportingScores(intel: DealIntelligence) {
  const scores = effectiveScores(intel);
  return (
    [
      ["opportunityQuality", "Opportunity quality"],
      ["valuationAttractiveness", "Valuation attractiveness"],
      ["portfolioFit", "Portfolio fit"],
      ["uncertainty", "Uncertainty"],
    ] as const
  ).map(([key, label]) => ({ key, label, value: scores[key] }));
}

export function plainAction(text?: string | null): string {
  if (!text) return "—";
  return text
    .replace(/Packet is ready\.\s*Confirm, pass, or term sheet\./i, "The memo is ready. Take the deal, pass, or make an offer.")
    .replace(/Advance with conditions, pass, or term sheet\.\s*You decide\./i, "Take it with a few conditions, pass, or make an offer. Your call.")
    .replace(/Partner confirms, watches, or passes\./i, "Take the deal, wait, or pass.")
    .replace(/\bARR\b/g, "Annual Recurring Revenue")
    .replace(/\bIC\b/g, "Investment Committee")
    .replace(/\bTAM\b/g, "Total Market Size");
}
