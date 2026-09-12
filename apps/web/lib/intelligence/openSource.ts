import { formatMetric, pick } from "../diligence/metrics";
import type { Deal, Metric } from "../diligence/types";
import { claimsFromFlags } from "./fromFlags";
import type { CompanyProfile, DealIntelligence } from "./types";

function companyName(deal: Deal): string {
  if (deal.company.trim()) return deal.company;
  return deal.name.replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) || "Untitled deal";
}

function preferRoom(metrics: Metric[], name: string): Metric | undefined {
  return pick(metrics, name, "financials") ?? pick(metrics, name, "metrics") ?? pick(metrics, name);
}

function profileFromRoom(deal: Deal): CompanyProfile {
  const company = companyName(deal);
  const arr = preferRoom(deal.metrics, "arr");
  const raise = preferRoom(deal.metrics, "raise") ?? pick(deal.metrics, "raise");
  const nrr = preferRoom(deal.metrics, "nrr");
  const headcount = preferRoom(deal.metrics, "headcount");
  const traction = [
    arr ? `${formatMetric(arr)} ARR` : "",
    nrr ? `${formatMetric(nrr)} NRR` : "",
    headcount ? formatMetric(headcount) : "",
  ]
    .filter(Boolean)
    .join(", ");
  return {
    company,
    founders: [],
    sector: "Unknown — inbound room",
    geography: "Unknown",
    stage: raise?.raw?.match(/pre-?seed|seed|series\s*[a-c]/i)?.[0] ?? "Unknown",
    fundraise: raise ? formatMetric(raise) : "Unknown",
    product: company,
    businessModel: "Unknown",
    traction: traction || "No traction figures extracted yet",
    source: "Inbound data room",
  };
}

export async function openSourceIntelligence(deal: Deal): Promise<DealIntelligence> {
  const now = new Date().toISOString();
  const profile = profileFromRoom(deal);
  const { claims, evidence } = claimsFromFlags(deal);
  const files = deal.docs.length
    ? `${deal.docs.length} file${deal.docs.length === 1 ? "" : "s"}`
    : "the inbound pack";
  return {
    stage: "source",
    profile,
    thesis: {
      score: undefined,
      matches: [],
      mismatches: [],
      exceptions: [],
      whyItMayStillMatter: "Profile only. Thesis scoring starts at triage — a sector miss will never auto-reject.",
      hardConstraintWarnings: [],
    },
    scores: deal.riskScore != null ? { risk: deal.riskScore } : {},
    pendingGate: {
      id: "triage",
      prompt: "Take a meeting, watch, or request information. A thesis miss is not a decline.",
      options: ["take meeting", "watch", "request info"],
    },
    overrides: [],
    claims,
    evidence,
    findings: [],
    risks: [],
    questions: [],
    tasks: [
      {
        id: `t-${deal.id}-triage`,
        title: "Run first-pass triage",
        owner: "You",
        status: "open",
        kind: "internal",
      },
    ],
    meetings: [],
    versions: deal.docs.map((doc, i) => ({
      id: `v-${deal.id}-${i}`,
      filename: doc.filename,
      version: "v1",
      date: deal.createdAt,
      note: doc.role === "deck" ? "Deck" : "Data room",
    })),
    assumptions: [],
    benchmarks: [],
    world: [],
    people: [],
    product: [],
    scoreChanges: [],
    timeline: [
      {
        id: `tl-${deal.id}-in`,
        at: now,
        title: "Inbound captured",
        body: `${files} landed. Deal opened at Source. Waiting on triage.`,
        source: "Inbound data room",
      },
    ],
    nextAction: {
      title: "Run triage on the inbound room",
      reason: "Highest decision value is whether this is worth a first meeting.",
      decisionImpact: "high",
      informationValue: "high",
      cost: "low",
      time: "20 minutes",
      urgency: "now",
    },
  };
}

export async function attachSourceIfMissing(deal: Deal): Promise<boolean> {
  if (deal.intelligence || deal.status !== "ready") return false;
  deal.intelligence = await openSourceIntelligence(deal);
  return true;
}
