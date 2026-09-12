import { normalizeStage, type DealIntelligence, type PendingGateId } from "./types";

export type DealVerb = {
  gate: PendingGateId;
  choice: string;
  label: string;
  primary?: boolean;
};

export function whoseCourt(intel: DealIntelligence): "you" | "founder" | "done" | null {
  if (intel.ic && !intel.pendingGate && normalizeStage(intel.stage) === "decision_room") return "done";
  if (intel.pendingGate?.id === "founder") return "founder";
  if (intel.pendingGate || normalizeStage(intel.stage) === "source" || normalizeStage(intel.stage) === "triage") {
    return "you";
  }
  return null;
}

export function courtCopy(intel: DealIntelligence): string {
  const court = whoseCourt(intel);
  if (court === "founder") {
    return "Ball is with the founder. Apply the reply to keep moving, or ask more.";
  }
  if (court === "done") return "Decision is on the book.";
  if (intel.pendingGate?.id === "ic" && intel.ic) {
    return "Your move. Take it, pass, or make an offer.";
  }
  if (intel.pendingGate?.id === "ic") {
    return "Your move. Open the decision room, or ask the founder again.";
  }
  if (intel.pendingGate?.id === "triage" || normalizeStage(intel.stage) === "source" || normalizeStage(intel.stage) === "triage") {
    return "Your move. Same verbs as the TUI — take the meeting, watch, or request info.";
  }
  return intel.pendingGate?.prompt ?? intel.nextAction.reason;
}

export function verbsFor(intel: DealIntelligence): DealVerb[] {
  if (whoseCourt(intel) === "done") return [];

  const gate = intel.pendingGate?.id;
  const stage = normalizeStage(intel.stage);

  if (gate === "founder") {
    return [
      { gate: "founder", choice: "ask more", label: "Ask more" },
      { gate: "founder", choice: "apply reply", label: "Apply founder reply", primary: true },
    ];
  }

  if (gate === "ic" && intel.ic) {
    return [
      { gate: "ic", choice: "confirm", label: "Take it, with conditions", primary: true },
      { gate: "ic", choice: "pass", label: "Pass" },
      { gate: "ic", choice: "term sheet", label: "Term sheet" },
    ];
  }

  if (gate === "ic") {
    return [
      { gate: "ic", choice: "ask more", label: "Ask more" },
      { gate: "ic", choice: "go to ic", label: "Open decision room", primary: true },
    ];
  }

  if (gate === "triage" || stage === "source" || stage === "triage") {
    return [
      { gate: "triage", choice: "watch", label: "Watch" },
      { gate: "triage", choice: "request info", label: "Request info" },
      { gate: "triage", choice: "take meeting", label: "Take meeting", primary: true },
    ];
  }

  if (stage === "validation" || stage === "process") {
    if (!intel.founderReplyApplied) {
      return [
        { gate: "founder", choice: "ask more", label: "Ask more" },
        { gate: "founder", choice: "apply reply", label: "Apply founder reply", primary: true },
      ];
    }
    return [
      { gate: "ic", choice: "ask more", label: "Ask more" },
      { gate: "ic", choice: "go to ic", label: "Open decision room", primary: true },
    ];
  }

  return [];
}
