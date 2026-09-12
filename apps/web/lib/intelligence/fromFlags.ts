import type { Deal, Flag, Metric } from "../diligence/types";
import type { Claim, Evidence } from "./types";

export function claimsFromFlags(deal: Deal): { claims: Claim[]; evidence: Evidence[] } {
  const claims: Claim[] = [];
  const evidence: Evidence[] = [];
  for (const flag of deal.flags) {
    const claimId = `flag-claim-${flag.id}`;
    const evId = `flag-ev-${flag.id}`;
    claims.push({
      id: claimId,
      text: flag.quote || flag.comment,
      metric: flag.metric,
      kind: "management",
      sourceDocument: deal.deckFilename,
      page: flag.page ?? undefined,
      sourceType: "management",
      verification: flag.severity === "contradiction" ? "contradicted" : flag.severity === "unsupported" ? "unverified" : "partial",
      confidence: flag.severity === "contradiction" ? 25 : 35,
      supportingIds: [],
      contradictingIds: flag.severity === "contradiction" ? [evId] : [],
      managementValue: flag.deckValue,
      recomputedValue: flag.roomValue,
      assessment: flag.comment,
    });
    if (flag.roomValue || flag.sourceFile) {
      evidence.push({
        id: evId,
        claimId,
        text: flag.roomValue ? `Room: ${flag.roomValue}` : flag.sourceCitation,
        sourceDocument: flag.sourceFile,
        location: flag.sourceSheet,
        sourceType: "primary",
        forOrAgainst: flag.severity === "contradiction" ? "against" : "missing",
      });
    }
  }
  return { claims, evidence };
}

export function metricPairs(metrics: Metric[]) {
  const names = [...new Set(metrics.map((m) => m.name))];
  return names.map((name) => {
    const deck = metrics.find((m) => m.name === name && m.sourceKind === "deck");
    const room = metrics.find((m) => m.name === name && m.sourceKind !== "deck");
    return { name, deck, room };
  });
}

export function mergeFlagClaims(deal: Deal): Deal {
  if (!deal.intelligence || !deal.flags.length) return deal;
  const { claims, evidence } = claimsFromFlags(deal);
  const have = new Set(deal.intelligence.claims.map((c) => c.metric).filter(Boolean));
  const extraClaims = claims.filter((c) => c.metric && !have.has(c.metric));
  if (!extraClaims.length) return deal;
  deal.intelligence.claims = [...deal.intelligence.claims, ...extraClaims];
  deal.intelligence.evidence = [
    ...deal.intelligence.evidence,
    ...evidence.filter((e) => extraClaims.some((c) => c.id === e.claimId)),
  ];
  return deal;
}
