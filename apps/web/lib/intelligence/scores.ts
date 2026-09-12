import type {
  Claim,
  DealIntelligence,
  OpportunityBreakdown,
  Question,
  ScoreKey,
  ScoreSet,
  ThesisSettings,
  CompanyProfile,
  ThesisAssessment,
} from "./types";

export const CONVICTION_WEIGHTS = {
  opportunityQuality: 0.28,
  thesisFit: 0.12,
  riskInverse: 0.18,
  uncertaintyInverse: 0.12,
  evidenceConfidence: 0.12,
  valuationAttractiveness: 0.12,
  portfolioFit: 0.06,
} as const;

export function clampScore(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

export function computeConviction(scores: ScoreSet): number {
  const oq = scores.opportunityQuality ?? 0;
  const fit = scores.thesisFit ?? 0;
  const risk = scores.risk ?? 50;
  const unc = scores.uncertainty ?? 50;
  const ev = scores.evidenceConfidence ?? 0;
  const val = scores.valuationAttractiveness ?? 50;
  const port = scores.portfolioFit ?? 50;
  return clampScore(
    CONVICTION_WEIGHTS.opportunityQuality * oq +
      CONVICTION_WEIGHTS.thesisFit * fit +
      CONVICTION_WEIGHTS.riskInverse * (100 - risk) +
      CONVICTION_WEIGHTS.uncertaintyInverse * (100 - unc) +
      CONVICTION_WEIGHTS.evidenceConfidence * ev +
      CONVICTION_WEIGHTS.valuationAttractiveness * val +
      CONVICTION_WEIGHTS.portfolioFit * port,
  );
}

export function computeOpportunity(parts: OpportunityBreakdown): number {
  const values = Object.values(parts);
  return clampScore(values.reduce((sum, n) => sum + n, 0) / values.length);
}

export function computeEvidenceConfidence(input: {
  claims: Claim[];
  questions: Question[];
  missingDocs: number;
}): number {
  const { claims, questions, missingDocs } = input;
  if (!claims.length) return 12;
  const verified = claims.filter((c) => c.verification === "verified").length;
  const contradicted = claims.filter((c) => c.verification === "contradicted").length;
  const openQ = questions.filter((q) => q.status === "open" || q.status === "asked").length;
  const base = (verified / claims.length) * 70 + 20;
  return clampScore(base - contradicted * 10 - openQ * 4 - missingDocs * 6);
}

export function assessThesis(profile: CompanyProfile, thesis: ThesisSettings): ThesisAssessment {
  const matches: ThesisAssessment["matches"] = [];
  const mismatches: ThesisAssessment["mismatches"] = [];
  const exceptions: ThesisAssessment["exceptions"] = [];
  const warnings: string[] = [];

  const sectorPreferred = thesis.preferredSectors.some((s) =>
    profile.sector.toLowerCase().includes(s.toLowerCase()),
  );
  const sectorAvoided = thesis.avoidedSectors.some((s) =>
    profile.sector.toLowerCase().includes(s.toLowerCase()),
  );
  if (sectorPreferred) {
    matches.push({
      label: "Sector",
      matches: true,
      detail: `${profile.sector} sits inside ${thesis.preferredSectors.join(", ")}.`,
    });
  } else if (sectorAvoided) {
    exceptions.push({
      label: "Sector — thesis exception",
      matches: false,
      detail: `${profile.sector} is on the avoided list. This is a warning, not a rejection.`,
    });
    warnings.push(`Hard-constraint warning: avoided sector (${profile.sector}). Continue evaluating.`);
  } else {
    mismatches.push({
      label: "Sector",
      matches: false,
      detail: `${profile.sector} is outside preferred sectors, not on the kill list.`,
    });
  }

  const stageOk = thesis.preferredStages.some((s) =>
    profile.stage.toLowerCase().includes(s.toLowerCase()),
  );
  (stageOk ? matches : mismatches).push({
    label: "Stage",
    matches: stageOk,
    detail: `${profile.stage} vs preferred ${thesis.preferredStages.join(", ")}.`,
  });

  const geoOk = thesis.preferredGeographies.some((g) =>
    profile.geography.toLowerCase().includes(g.toLowerCase()),
  );
  (geoOk ? matches : mismatches).push({
    label: "Geography",
    matches: geoOk,
    detail: `${profile.geography} vs ${thesis.preferredGeographies.join(", ")}.`,
  });

  const raise = profile.fundraise.toLowerCase();
  const checkOk =
    raise.includes("seed") ||
    raise.includes("series a") ||
    raise.includes("$") ||
    thesis.preferredStages.length > 0;
  if (checkOk) {
    matches.push({
      label: "Check size / raise",
      matches: true,
      detail: `${profile.fundraise}. Fund writes ${thesis.checkSizeMin}–${thesis.checkSizeMax}.`,
    });
  }

  const matched = matches.length;
  const penalized = mismatches.length + exceptions.length * 1.5;
  const score = clampScore(58 + matched * 10 - penalized * 8);

  return {
    score,
    matches,
    mismatches,
    exceptions,
    whyItMayStillMatter: exceptions.length
      ? "A thesis miss can still be an attractive investment. Score the company, then decide whether the exception is worth the allocation."
      : mismatches.length
        ? "The miss is a preference, not a kill. Opportunity quality and price still decide."
        : "The deal sits inside the stated mandate. Thesis fit is a component of conviction, not a gate.",
    hardConstraintWarnings: warnings,
  };
}

export function applyOverrides(scores: ScoreSet, intel: DealIntelligence): ScoreSet {
  const next = { ...scores };
  for (const over of intel.overrides) {
    next[over.key] = over.value;
  }
  return next;
}

export function effectiveScores(intel: DealIntelligence): ScoreSet {
  const computed: ScoreSet = { ...intel.scores };
  if (
    computed.opportunityQuality == null &&
    intel.scoreBreakdown?.opportunity
  ) {
    computed.opportunityQuality = computeOpportunity(intel.scoreBreakdown.opportunity);
  }
  if (computed.investmentConviction == null && hasConvictionInputs(computed)) {
    computed.investmentConviction = computeConviction(computed);
  }
  return applyOverrides(computed, intel);
}

function hasConvictionInputs(scores: ScoreSet): boolean {
  return (
    scores.opportunityQuality != null ||
    scores.thesisFit != null ||
    scores.risk != null
  );
}

export function scoreTone(key: ScoreKey, value?: number): string {
  if (value == null) return "text-paper/40";
  if (key === "risk" || key === "uncertainty") {
    if (value >= 70) return "text-flag-red";
    if (value >= 50) return "text-flag-amber";
    return "text-ledger";
  }
  if (value >= 70) return "text-ledger";
  if (value >= 45) return "text-flag-amber";
  return "text-flag-red";
}

export function convictionCopy(): string {
  return "How strong is the investment case right now — not the probability that we write the check.";
}
