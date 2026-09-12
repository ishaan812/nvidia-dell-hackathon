import type { ScoreKey } from "./intelligence/types";

export function riskTone(score?: number) {
  if (score == null) return "text-mute";
  if (score >= 70) return "text-flag-red";
  if (score >= 50) return "text-flag-amber";
  return "text-ledger";
}

export function when(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function whenDay(iso?: string) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function scoreDisplay(value?: number) {
  return value == null ? "—" : String(value);
}

export function recommendationLabel(value: string) {
  const labels: Record<string, string> = {
    advance: "Advance",
    advance_with_conditions: "Advance with conditions",
    watch: "Watch",
    pass: "Pass",
    thesis_exception: "Thesis exception",
    term_sheet: "Term sheet",
    take_meeting: "Take meeting",
    request_information: "Request information",
    decline: "Decline",
  };
  return labels[value] ?? value;
}

export function kindLabel(kind: string) {
  const labels: Record<string, string> = {
    fact: "Fact",
    management: "Management assumption",
    benchmark: "External benchmark",
    agent: "Agent estimate",
    scenario: "Scenario",
    primary: "Primary",
    secondary: "Secondary",
    unverified: "Unverified",
  };
  return labels[kind] ?? kind;
}

export function scoreKeyLabel(key: ScoreKey) {
  const labels: Record<ScoreKey, string> = {
    thesisFit: "Thesis fit",
    opportunityQuality: "Opportunity quality",
    risk: "Risk",
    uncertainty: "Uncertainty",
    evidenceConfidence: "Evidence confidence",
    valuationAttractiveness: "Valuation attractiveness",
    portfolioFit: "Portfolio fit",
    investmentConviction: "Investment conviction",
  };
  return labels[key];
}
