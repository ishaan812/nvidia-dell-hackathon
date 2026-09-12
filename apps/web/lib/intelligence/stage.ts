import { DEAL_STAGES, STAGE_LABELS, type DealStage, type StageSnapshot } from "./types";

export { DEAL_STAGES, STAGE_LABELS, normalizeStage } from "./types";

export const STAGE_DEFS: Record<DealStage, StageSnapshot> = {
  source: {
    entryCriteria: ["Inbound or outbound opportunity captured", "Minimum company identity"],
    expectedInputs: ["Deck or email", "Referrer", "Raise amount if stated"],
    expectedDocuments: ["Pitch deck (optional)"],
    aiChecks: ["Extract company, founders, sector, geography, stage, raise"],
    openQuestions: ["Is this a real company with a named raise?"],
    requiredActions: ["Create the deal", "Run initial profile extraction"],
    exitCriteria: ["Profile saved", "Deal visible on the blotter"],
    nextStates: ["triage"],
  },
  triage: {
    entryCriteria: ["Profile exists", "Enough text to score first-pass fit"],
    expectedInputs: ["Sector, stage, raise, traction snippet"],
    expectedDocuments: ["Deck or one-pager"],
    aiChecks: ["Thesis fit", "Initial market", "Founder signals", "Obvious risks"],
    openQuestions: ["Take a meeting, request information, watch, or decline?"],
    requiredActions: ["Read the profile", "Record a recommended next step"],
    exitCriteria: ["Initial scores written", "Recommendation is not a thesis auto-reject"],
    nextStates: ["validation", "process", "source"],
  },
  validation: {
    entryCriteria: ["Triage cleared a meeting or the room is already in"],
    expectedInputs: ["Model, metrics, market claims, team, product"],
    expectedDocuments: ["Financial model", "Metrics pack", "Cap table", "TAM slide", "Team / product"],
    aiChecks: [
      "Financial analysis",
      "Market analysis",
      "Customer analysis",
      "Competition",
      "Product",
      "Team",
      "External / real-world validation",
      "Benchmarking",
      "Plausibility analysis",
      "Evidence checks",
    ],
    openQuestions: ["Which management claims survive the room and the world?"],
    requiredActions: ["Reconcile deck vs room", "Test outside the room", "Separate people and product claims"],
    exitCriteria: ["Material claims have a verification status"],
    nextStates: ["process", "decision_room", "triage"],
  },
  process: {
    entryCriteria: ["A human is waiting on a meeting, document, or owner"],
    expectedInputs: ["Owner", "Meeting time", "Document request list", "Open questions"],
    expectedDocuments: ["Data room index", "Calendar hold", "Founder replies"],
    aiChecks: ["What we are waiting on", "Who owns each item", "Whether a reply should re-run analysis"],
    openQuestions: ["What is blocking the next belief update?"],
    requiredActions: ["Assign owners", "Send document requests", "Log meetings and notes"],
    exitCriteria: ["Next meeting booked, materials inbound, or the partner is ready for Decision"],
    nextStates: ["validation", "decision_room", "triage"],
  },
  decision_room: {
    entryCriteria: ["Scores, risks, and a valuation view exist"],
    expectedInputs: ["Conviction breakdown", "open questions", "partner decision"],
    expectedDocuments: ["IC packet"],
    aiChecks: ["Packet completeness", "assumption visibility"],
    openQuestions: ["Advance, advance with conditions, watch, pass, or term sheet?"],
    requiredActions: ["Read the case", "Ask the analyst", "Record a human decision"],
    exitCriteria: ["Recommendation recorded by the VC"],
    nextStates: ["validation", "process"],
  },
};

export function stageIndex(stage: DealStage): number {
  return DEAL_STAGES.indexOf(stage);
}

export function nextStages(stage: DealStage): DealStage[] {
  return STAGE_DEFS[stage].nextStates;
}

export function stageMark(
  stage: DealStage,
  current: DealStage,
  opts?: { validated?: boolean; decided?: boolean },
): "done" | "now" | "next" {
  if (stage === current) return "now";
  const here = stageIndex(current);
  const at = stageIndex(stage);
  if (stage === "validation" && current === "process" && opts?.validated) return "done";
  if (stage === "process" && current === "decision_room") return "done";
  if (stage === "decision_room" && opts?.decided) return "done";
  return at < here ? "done" : "next";
}
