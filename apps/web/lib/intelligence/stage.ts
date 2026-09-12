import { DEAL_STAGES, STAGE_LABELS, type DealStage, type StageSnapshot } from "./types";

export { DEAL_STAGES, STAGE_LABELS };

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
    nextStates: ["process", "source"],
  },
  process: {
    entryCriteria: ["Triage recommended a meeting or more information"],
    expectedInputs: ["Owner", "Meeting time", "Document request list"],
    expectedDocuments: ["Data room index", "Calendar hold"],
    aiChecks: ["What we are waiting on", "Who owns each item"],
    openQuestions: ["What is blocking the next stage?"],
    requiredActions: ["Assign owners", "Send document requests"],
    exitCriteria: ["Next meeting booked or materials inbound"],
    nextStates: ["numbers", "triage"],
  },
  numbers: {
    entryCriteria: ["Financials or metric pack in the room"],
    expectedInputs: ["Model, ARR, burn, cohorts if claimed"],
    expectedDocuments: ["Financial model", "Metrics pack", "Cap table"],
    aiChecks: [
      "Claim-to-evidence",
      "Cross-document contradiction",
      "Stated vs recomputed",
      "Forward vs backward",
      "Population completeness",
      "Plausibility vs benchmark",
    ],
    openQuestions: ["Which management numbers survive the room?"],
    requiredActions: ["Reconcile deck vs room", "Flag contradictions"],
    exitCriteria: ["Material claims have a verification status"],
    nextStates: ["world", "founder_loop", "process"],
  },
  world: {
    entryCriteria: ["Company story is specific enough to test outside the room"],
    expectedInputs: ["Market claim, competitors, pricing"],
    expectedDocuments: ["TAM slide", "any third-party study"],
    aiChecks: ["Independent market evidence", "Public signals", "Hiring / news"],
    openQuestions: ["Does the outside world agree with the deck?"],
    requiredActions: ["Record independent evidence for and against"],
    exitCriteria: ["Each material world claim has an assessment"],
    nextStates: ["people_product", "founder_loop"],
  },
  people_product: {
    entryCriteria: ["Named founders and a product description"],
    expectedInputs: ["Bios, org, product demo notes"],
    expectedDocuments: ["Team slide", "product walkthrough"],
    aiChecks: ["Founder-market fit", "Key-person risk", "Differentiation vs evidence"],
    openQuestions: ["Can this team ship, and is the product real?"],
    requiredActions: ["Separate claims from verified evidence"],
    exitCriteria: ["People and product notes stored with evidence links"],
    nextStates: ["founder_loop", "ic"],
  },
  founder_loop: {
    entryCriteria: ["At least one unresolved finding"],
    expectedInputs: ["Questions tied to claims"],
    expectedDocuments: ["Founder answers", "updated model"],
    aiChecks: ["Response completeness", "New contradictions"],
    openQuestions: ["Did the answer close the finding or raise a new one?"],
    requiredActions: ["Send questions", "Rerun affected checks on reply"],
    exitCriteria: ["Material questions answered or explicitly parked"],
    nextStates: ["ic", "numbers"],
  },
  ic: {
    entryCriteria: ["Scores, risks, and a valuation view exist"],
    expectedInputs: ["Conviction breakdown", "open questions"],
    expectedDocuments: ["IC packet"],
    aiChecks: ["Packet completeness", "assumption visibility"],
    openQuestions: ["Advance, advance with conditions, watch, pass, or term sheet?"],
    requiredActions: ["Generate packet", "Partner reads it"],
    exitCriteria: ["Recommendation recorded by the VC"],
    nextStates: ["close_pass", "founder_loop"],
  },
  close_pass: {
    entryCriteria: ["IC recommendation exists"],
    expectedInputs: ["Decision and reason"],
    expectedDocuments: ["Term sheet or pass note"],
    aiChecks: ["Decision is attributed to a human"],
    openQuestions: ["What do we tell the founder?"],
    requiredActions: ["Record close or pass"],
    exitCriteria: ["Outcome stored on the deal"],
    nextStates: [],
  },
};

export function stageIndex(stage: DealStage): number {
  return DEAL_STAGES.indexOf(stage);
}

export function nextStages(stage: DealStage): DealStage[] {
  return STAGE_DEFS[stage].nextStates;
}
