import { loadDeal, saveDeal } from "../diligence/store";
import type { Deal } from "../diligence/types";
import { computeConviction, effectiveScores } from "./scores";
import type { DealIntelligence, ScoreKey } from "./types";

export async function loadIntelligence(id: string): Promise<{ deal: Deal; intel: DealIntelligence } | null> {
  const deal = await loadDeal(id);
  if (!deal?.intelligence) return null;
  return { deal, intel: deal.intelligence };
}

export async function saveIntelligence(deal: Deal, intel: DealIntelligence): Promise<Deal> {
  const scores = effectiveScores(intel);
  if (hasAnyScore(scores) && scores.investmentConviction == null) {
    scores.investmentConviction = computeConviction(scores);
  }
  intel.scores = scores;
  deal.intelligence = intel;
  deal.updatedAt = new Date().toISOString();
  await saveDeal(deal);
  return deal;
}

export async function applyScoreOverride(
  id: string,
  key: ScoreKey,
  value: number,
  reason: string,
): Promise<Deal | null> {
  const loaded = await loadIntelligence(id);
  if (!loaded) return null;
  const { deal, intel } = loaded;
  const previous = intel.scores[key] ?? null;
  intel.overrides = intel.overrides.filter((item) => item.key !== key);
  intel.overrides.push({
    key,
    value,
    reason,
    at: new Date().toISOString(),
  });
  intel.scoreChanges.push({
    id: `override-${key}-${Date.now()}`,
    key,
    previous,
    next: value,
    reason,
    date: new Date().toISOString(),
    source: "VC override",
  });
  intel.timeline.push({
    id: `tl-override-${Date.now()}`,
    at: new Date().toISOString(),
    title: `Override: ${key}`,
    body: reason,
    source: "VC",
  });
  return saveIntelligence(deal, intel);
}

export async function applyFounderReply(id: string): Promise<Deal | null> {
  const loaded = await loadIntelligence(id);
  if (!loaded) return null;
  const { deal, intel } = loaded;
  if (intel.founderReplyApplied) return deal;

  const question = intel.questions.find((item) => item.id === "q-arr");
  if (question) {
    question.status = "answered";
  }
  const prev = intel.scores.investmentConviction ?? 52;
  const next = Math.min(100, prev + 5);
  intel.scores.investmentConviction = next;
  intel.scores.evidenceConfidence = Math.min(100, (intel.scores.evidenceConfidence ?? 38) + 8);
  intel.scores.uncertainty = Math.max(0, (intel.scores.uncertainty ?? 62) - 7);
  intel.founderReplyApplied = true;
  intel.nextAction = {
    title: "Ask for the customer-cohort workbook",
    reason: "ARR definition is now stated. The remaining decision value is retention quality.",
    decisionImpact: "high",
    informationValue: "high",
    cost: "low",
    time: "3 days",
    urgency: "this_week",
  };
  intel.scoreChanges.push({
    id: "sc-founder-arr",
    key: "investmentConviction",
    previous: prev,
    next,
    reason: "Founder restated ARR as billed + contracted, and sent the monthly roll-forward.",
    evidence: "Founder email 12 Sep · model v3",
    date: new Date().toISOString(),
    source: "Founder reply",
  });
  intel.timeline.push({
    id: "tl-founder-arr",
    at: new Date().toISOString(),
    title: "Founder answered the ARR question",
    body: "Definition aligned. Conviction +5. Next: cohort workbook.",
    source: "Founder loop",
  });
  return saveIntelligence(deal, intel);
}

function hasAnyScore(scores: DealIntelligence["scores"]): boolean {
  return Object.values(scores).some((value) => value != null);
}
