import { cp, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { dirs } from "../diligence/paths";
import { loadDeal, saveDeal } from "../diligence/store";
import type { Deal, DocKind, FileRole, Flag, IngestedDoc, Metric } from "../diligence/types";
import { assessThesis, computeConviction } from "./scores";
import { defaultThesis, loadThesis, saveThesis } from "./thesis";
import type {
  CompanyProfile,
  DealIntelligence,
  DealStage,
  OpportunityBreakdown,
} from "./types";

export const SEED_IDS = [
  "harbor-mail",
  "lumen-health",
  "aether-grid",
  "helio-freight",
] as const;

const OPP_LUMEN: OpportunityBreakdown = {
  market: 78,
  product: 71,
  team: 74,
  traction: 80,
  businessModel: 73,
  financialQuality: 68,
  competitivePosition: 64,
  scalability: 70,
  exitPotential: 66,
};

const OPP_NORTH: OpportunityBreakdown = {
  market: 72,
  product: 70,
  team: 68,
  traction: 55,
  businessModel: 64,
  financialQuality: 38,
  competitivePosition: 61,
  scalability: 73,
  exitPotential: 69,
};

const OPP_AETHER: OpportunityBreakdown = {
  market: 81,
  product: 76,
  team: 79,
  traction: 58,
  businessModel: 74,
  financialQuality: 62,
  competitivePosition: 71,
  scalability: 77,
  exitPotential: 72,
};

const OPP_HELIO: OpportunityBreakdown = {
  market: 84,
  product: 78,
  team: 75,
  traction: 73,
  businessModel: 80,
  financialQuality: 71,
  competitivePosition: 69,
  scalability: 82,
  exitPotential: 77,
};

function avg(parts: OpportunityBreakdown): number {
  const values = Object.values(parts);
  return Math.round(values.reduce((sum, n) => sum + n, 0) / values.length);
}

function doc(
  dealId: string,
  filename: string,
  kind: DocKind,
  role: FileRole,
  markdown: string,
): IngestedDoc {
  return {
    docId: `${dealId}-${filename}`,
    filename,
    kind,
    role,
    path: path.join(dirs().data, dealId, "workspace", filename),
    markdown,
    pageTexts: { 1: markdown.slice(0, 1200) },
  };
}

function shell(id: string, company: string, createdAt: string, stage: DealStage): Deal {
  return {
    id,
    name: company,
    company,
    status: "ready",
    createdAt,
    updatedAt: createdAt,
    sourcePath: path.join(dirs().data, id, "workspace"),
    docs: [],
    metrics: [],
    flags: [],
    graph: { nodes: [], edges: [], rows: [] },
    events: [{ at: createdAt, stage, message: `Seeded at ${stage}` }],
    sandbox: {
      kind: "local",
      root: path.join(dirs().data, id),
      workspace: path.join(dirs().data, id, "workspace"),
    },
  };
}

async function writeWorkspace(deal: Deal, files: { filename: string; body: string }[]) {
  const workspace = deal.sandbox?.workspace ?? path.join(dirs().data, deal.id, "workspace");
  await mkdir(workspace, { recursive: true });
  for (const file of files) {
    await writeFile(path.join(workspace, file.filename), file.body);
  }
}

function harbor(): { deal: Deal; files: { filename: string; body: string }[] } {
  const profile: CompanyProfile = {
    company: "HarborMail",
    founders: ["Benny Rubin", "Vinoop Thayatt"],
    sector: "B2B infrastructure — email deliverability",
    geography: "United States (Austin)",
    stage: "Pre-seed",
    fundraise: "Raising $2.2M pre-seed",
    product: "Inbox placement API for transactional email",
    businessModel: "Usage-based API",
    traction: "11 design partners, no paid ARR stated",
    source: "Warm intro from First Round scout · 11 Sep",
  };
  const created = "2026-09-11T15:40:00.000Z";
  const deal = shell("harbor-mail", "HarborMail", created, "source");
  const note = `# HarborMail inbound\n\nBenny Rubin (ex-Twilio) and Vinoop Thayatt. Inbox placement API.\nRaising $2.2M. 11 design partners. Intro from First Round scout.`;
  deal.docs = [doc(deal.id, "inbound-note.md", "other", "room", note)];
  deal.intelligence = {
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
    scores: {},
    overrides: [],
    claims: [],
    evidence: [],
    findings: [],
    risks: [],
    questions: [],
    tasks: [
      {
        id: "t-hm-triage",
        title: "Run first-pass triage",
        owner: "You",
        status: "open",
        kind: "internal",
      },
    ],
    meetings: [],
    versions: [{ id: "v1", filename: "inbound-note.md", version: "v1", date: created, note: "Scout email" }],
    assumptions: [],
    benchmarks: [],
    world: [],
    people: [],
    product: [],
    scoreChanges: [],
    timeline: [
      {
        id: "tl-hm-in",
        at: created,
        title: "Inbound captured",
        body: "Scout forwarded Benny’s note. Deal created in SOURCE.",
        source: "Inbox",
      },
    ],
    nextAction: {
      title: "Run triage on the inbound note",
      reason: "Highest decision value is whether this is worth a first meeting.",
      decisionImpact: "high",
      informationValue: "high",
      cost: "low",
      time: "20 minutes",
      urgency: "now",
    },
  };
  return { deal, files: [{ filename: "inbound-note.md", body: note }] };
}

function lumen(thesisScore: number): { deal: Deal; files: { filename: string; body: string }[] } {
  const profile: CompanyProfile = {
    company: "Lumen Health",
    founders: ["Kristen Valdes", "Jenny Gackic"],
    sector: "Clinic-first healthcare — virtual specialty clinic",
    geography: "United States (Boston)",
    stage: "Seed",
    fundraise: "Raising $6M seed at $32M post",
    product: "Virtual endocrinology clinic with at-home labs",
    businessModel: "Visit + care-management fee, contracted with two regionals",
    traction: "$2.1M ARR, 118% NRR, 14-month payback",
    source: "Partner office hours",
  };
  const created = "2026-09-08T18:00:00.000Z";
  const deal = shell("lumen-health", "Lumen Health", created, "triage");
  const deck = `# Lumen Health\n\nVirtual endocrinology. $2.1M ARR. 118% NRR.\nRaising $6M at $32M post. Two regional health-system contracts.`;
  deal.docs = [doc(deal.id, "lumen-one-pager.md", "deck", "deck", deck)];
  const oq = avg(OPP_LUMEN);
  const scores = {
    thesisFit: thesisScore,
    opportunityQuality: oq,
    risk: 41,
    uncertainty: 48,
    evidenceConfidence: 44,
    valuationAttractiveness: 52,
    portfolioFit: 38,
    investmentConviction: 0,
  };
  scores.investmentConviction = computeConviction(scores);
  deal.intelligence = {
    stage: "triage",
    profile,
    thesis: {
      score: thesisScore,
      matches: [
        { label: "Stage", matches: true, detail: "Seed is inside the mandate." },
        { label: "Geography", matches: true, detail: "Boston / United States." },
        { label: "Traction quality", matches: true, detail: "NRR and contracted revenue look real enough to meet." },
      ],
      mismatches: [],
      exceptions: [
        {
          label: "Sector — thesis exception",
          matches: false,
          detail: "Clinic-first healthcare is a hard-constraint warning. Not an automatic pass.",
        },
      ],
      whyItMayStillMatter:
        "The clinic wrapper is the miss. The lab-network and care-protocol layer could be infrastructure. Meet them before you decide the exception is fatal.",
      hardConstraintWarnings: [
        "Hard-constraint warning: avoided sector (clinic-first healthcare). Continue evaluating.",
      ],
    },
    scores,
    scoreBreakdown: {
      opportunity: OPP_LUMEN,
      convictionNote:
        "Conviction is not P(invest). Thesis fit is only 12% of the formula. The exception is visible; the company is still scored.",
    },
    overrides: [],
    claims: [
      {
        id: "c-lumen-arr",
        text: "$2.1M ARR",
        metric: "arr",
        kind: "management",
        sourceDocument: "lumen-one-pager.md",
        sourceType: "management",
        verification: "unverified",
        confidence: 40,
        supportingIds: [],
        contradictingIds: [],
        managementValue: "$2.1M",
        assessment: "Stated on the one-pager. No model in the room yet.",
      },
    ],
    evidence: [],
    findings: [
      {
        id: "f-lumen-exception",
        title: "Thesis exception: clinic-first healthcare",
        body: "Hard constraint fired as a warning. Recommended next step is Take meeting, not Decline.",
        kind: "thesis_exception",
        claimIds: [],
        evidenceIds: [],
      },
    ],
    risks: [
      {
        id: "r-lumen-reimburse",
        category: "legal",
        description: "Reimbursement and corporate-practice-of-medicine constraints in new states.",
        probability: "medium",
        impact: "high",
        materiality: "high",
        evidenceConfidence: 35,
        persistence: "structural",
        timeHorizon: "12–24 months",
        status: "open",
        owner: "You",
        evidenceIds: [],
        cluster: "healthcare-regulation",
      },
    ],
    questions: [
      {
        id: "q-lumen-infra",
        question: "What fraction of value is the clinic vs the protocol/lab network?",
        reason: "Decides whether the thesis exception is cosmetic or structural.",
        evidenceRequired: "Unit economics split by service line",
        owner: "Kristen Valdes",
        status: "open",
      },
    ],
    tasks: [
      {
        id: "t-lumen-meet",
        title: "Schedule first meeting",
        owner: "You",
        status: "open",
        kind: "meeting",
        deadline: "2026-09-16",
      },
    ],
    meetings: [],
    versions: [{ id: "v1", filename: "lumen-one-pager.md", version: "v1", date: created, note: "Office-hours leave-behind" }],
    assumptions: [],
    benchmarks: [],
    world: [],
    people: [
      {
        title: "Founder-market fit",
        claim: "Kristen ran a hospital endocrine service; Jenny built lab logistics at Color.",
        evidence: "Bios on the one-pager only.",
        assessment: "Plausible. Unverified.",
      },
    ],
    product: [],
    scoreChanges: [
      {
        id: "sc-lumen-init",
        key: "investmentConviction",
        previous: null,
        next: scores.investmentConviction ?? null,
        reason: "Initial triage scores. Thesis exception flagged; meeting still recommended.",
        date: created,
        source: "Triage",
      },
    ],
    timeline: [
      {
        id: "tl-lumen-in",
        at: created,
        title: "Office-hours inbound",
        body: "One-pager received. Thesis exception raised. Recommendation: take meeting.",
        source: "Triage",
      },
    ],
    nextAction: {
      title: "Take the meeting",
      reason: "Exception is a warning. Traction quality is high enough that a pass now would be thesis-as-gate — which we do not do.",
      decisionImpact: "high",
      informationValue: "high",
      cost: "low",
      time: "45 minutes",
      urgency: "this_week",
    },
    triage: {
      outcome: "take_meeting",
      note: "Do not decline on thesis mismatch. Ask how much of this is infrastructure.",
    },
    portfolio: {
      sector: "Would be first healthcare clinic. Concentrates regulatory risk.",
      stage: "Seed — on-thesis.",
      geography: "US — on-thesis.",
      capitalNote: "$6M raise is above our typical check; we would be a smaller check.",
      concentration: "Adds a new regulated vertical.",
      correlation: "Low correlation with industrial/climate book.",
      followOn: "If we take the exception, reserve for a $1.5M follow-on.",
    },
  };
  return { deal, files: [{ filename: "lumen-one-pager.md", body: deck }] };
}

function northstar(): { deal: Deal; files: { filename: string; body: string }[]; copySample: boolean } {
  const profile: CompanyProfile = {
    company: "Northstar Robotics",
    founders: ["Simon Kalouche", "Erik Nieves"],
    sector: "Industrial robotics — warehouse autonomy",
    geography: "United States (Pittsburgh)",
    stage: "Series A",
    fundraise: "Raising $18M Series A at $90M post",
    product: "Autonomous pallet movers for existing warehouses",
    businessModel: "Hardware + annual software",
    traction: "Deck $4.2M ARR; model $2.8M",
    source: "Inbound data room",
  };
  const created = "2026-09-02T14:00:00.000Z";
  const deal = shell("northstar-robotics", "Northstar Robotics", created, "validation");
  const oq = avg(OPP_NORTH);
  const scores = {
    thesisFit: 82,
    opportunityQuality: oq,
    risk: 71,
    uncertainty: 64,
    evidenceConfidence: 38,
    valuationAttractiveness: 47,
    portfolioFit: 74,
    investmentConviction: 0,
  };
  scores.investmentConviction = computeConviction(scores);

  const metrics: Metric[] = [
    { name: "arr", value: 4_200_000, unit: "usd", raw: "$4.2M ARR", sourceKind: "deck", citation: { filename: "northstar-deck.pdf", page: 3, label: "ARR" } },
    { name: "arr", value: 2_800_000, unit: "usd", raw: "$2.8M", sourceKind: "financials", citation: { filename: "northstar-financial-model.xlsx", sheet: "Summary", label: "ARR" } },
    { name: "runway_months", value: 18, unit: "months", raw: "18 months of runway", sourceKind: "deck", citation: { filename: "northstar-deck.pdf", page: 8 } },
    { name: "runway_months", value: 9, unit: "months", raw: "9 months", sourceKind: "financials", citation: { filename: "northstar-financial-model.xlsx", sheet: "Cash" } },
    { name: "headcount", value: 40, unit: "people", raw: "40 people", sourceKind: "deck", citation: { filename: "northstar-deck.pdf", page: 11 } },
    { name: "headcount", value: 27, unit: "people", raw: "27", sourceKind: "financials", citation: { filename: "northstar-financial-model.xlsx", sheet: "Headcount" } },
    { name: "founder_ownership_pct", value: 15, unit: "pct", raw: "Founders 15%", sourceKind: "deck", citation: { filename: "northstar-deck.pdf", page: 14 } },
    { name: "founder_ownership_pct", value: 8.4, unit: "pct", raw: "8.4%", sourceKind: "cap_table", citation: { filename: "northstar-cap-table.xlsx", sheet: "Cap" } },
    { name: "tam", value: 48_000_000_000, unit: "usd", raw: "$48B TAM", sourceKind: "deck", citation: { filename: "northstar-deck.pdf", page: 5 } },
    { name: "burn_monthly", value: 420_000, unit: "usd", raw: "$420k", sourceKind: "financials", citation: { filename: "northstar-financial-model.xlsx", sheet: "Cash" } },
    { name: "cash", value: 3_800_000, unit: "usd", raw: "$3.8M", sourceKind: "financials", citation: { filename: "northstar-financial-model.xlsx", sheet: "Cash" } },
  ];

  const flags: Flag[] = [
    {
      id: "flag-arr",
      docId: "deck",
      page: 3,
      type: "highlight",
      severity: "contradiction",
      metric: "arr",
      comment: "Deck shows $4.2M ARR; the data room shows $2.8M.",
      sourceCitation: "northstar-financial-model.xlsx · Summary",
      quote: "$4.2M ARR",
      sourceFile: "northstar-financial-model.xlsx",
      sourceSheet: "Summary",
      deckValue: "$4.2M",
      roomValue: "$2.8M",
    },
    {
      id: "flag-runway_months",
      docId: "deck",
      page: 8,
      type: "highlight",
      severity: "contradiction",
      metric: "runway_months",
      comment: "Deck shows 18 months of runway; cash / burn is 9 months.",
      sourceCitation: "northstar-financial-model.xlsx · Cash",
      quote: "18 months of runway",
      sourceFile: "northstar-financial-model.xlsx",
      deckValue: "18 months",
      roomValue: "9 months",
    },
    {
      id: "flag-headcount",
      docId: "deck",
      page: 11,
      type: "highlight",
      severity: "contradiction",
      metric: "headcount",
      comment: "Deck shows 40 people; the model shows 27.",
      sourceCitation: "northstar-financial-model.xlsx · Headcount",
      quote: "40 people",
      sourceFile: "northstar-financial-model.xlsx",
      deckValue: "40",
      roomValue: "27",
    },
    {
      id: "flag-founder_ownership_pct",
      docId: "deck",
      page: 14,
      type: "highlight",
      severity: "contradiction",
      metric: "founder_ownership_pct",
      comment: "Deck shows founders 15%; the cap table is 8.4% fully diluted.",
      sourceCitation: "northstar-cap-table.xlsx · Cap",
      quote: "Founders 15%",
      sourceFile: "northstar-cap-table.xlsx",
      deckValue: "15%",
      roomValue: "8.4%",
    },
    {
      id: "flag-tam",
      docId: "deck",
      page: 5,
      type: "highlight",
      severity: "unsupported",
      metric: "tam",
      comment: "$48B TAM has no market study in the room.",
      sourceCitation: "northstar-deck.pdf · slide 5",
      quote: "$48B TAM",
    },
  ];

  deal.metrics = metrics;
  deal.flags = flags;
  deal.riskScore = 82;
  deal.deckFilename = "northstar-deck.pdf";
  deal.graph = {
    nodes: [
      { id: "co", type: "company", label: "Northstar Robotics" },
      { id: "arr", type: "metric", label: "ARR", value: "$4.2M vs $2.8M", severity: "contradiction" },
    ],
    edges: [{ source: "co", target: "arr", rel: "claims", severity: "contradiction" }],
    rows: [
      { metric: "arr", label: "ARR", deck: "$4.2M", room: "$2.8M", status: "contradiction", flagId: "flag-arr", page: 3 },
      { metric: "runway_months", label: "Runway", deck: "18 mo", room: "9 mo", status: "contradiction", flagId: "flag-runway_months", page: 8 },
      { metric: "headcount", label: "Headcount", deck: "40", room: "27", status: "contradiction", flagId: "flag-headcount", page: 11 },
      { metric: "founder_ownership_pct", label: "Founder ownership", deck: "15%", room: "8.4%", status: "contradiction", flagId: "flag-founder_ownership_pct", page: 14 },
      { metric: "tam", label: "TAM", deck: "$48B", status: "unsupported", flagId: "flag-tam", page: 5 },
    ],
  };

  const deckMd = "Northstar Robotics. $4.2M ARR. 18 months runway. 40 people. Founders 15%. $48B TAM.";
  deal.docs = [
    doc(deal.id, "northstar-deck.pdf", "deck", "deck", deckMd),
    doc(deal.id, "northstar-financial-model.xlsx", "financials", "room", "ARR 2.8M. Cash 3.8M. Burn 420k. Runway 9. Headcount 27."),
    doc(deal.id, "northstar-cap-table.xlsx", "cap_table", "room", "Founders 8.4% fully diluted."),
    doc(deal.id, "northstar-metrics.docx", "metrics", "room", "No cohort retention table."),
  ];

  deal.intelligence = {
    stage: "validation",
    profile,
    thesis: {
      score: 82,
      matches: [
        { label: "Sector", matches: true, detail: "Industrial robotics is on-thesis." },
        { label: "Stage", matches: true, detail: "Series A is on-thesis." },
        { label: "Geography", matches: true, detail: "Pittsburgh / United States." },
      ],
      mismatches: [
        { label: "Check size", matches: false, detail: "$18M raise — we would be a smaller check, not the lead." },
      ],
      exceptions: [],
      whyItMayStillMatter: "Mandate fit is strong. The live issue is that the numbers do not agree with themselves.",
      hardConstraintWarnings: [],
    },
    scores,
    scoreBreakdown: {
      opportunity: OPP_NORTH,
      convictionNote: "Quality of the company is separate from quality of the numbers. Financial quality is the drag.",
    },
    overrides: [],
    claims: [
      {
        id: "c-ns-arr",
        text: "ARR is $4.2M",
        metric: "arr",
        kind: "management",
        sourceDocument: "northstar-deck.pdf",
        page: 3,
        sourceType: "management",
        verification: "contradicted",
        confidence: 22,
        supportingIds: [],
        contradictingIds: ["e-ns-arr-model"],
        managementValue: "$4.2M",
        recomputedValue: "$2.8M",
        benchmarkValue: "$2.1M median warehouse-autonomy A",
        range80: "$2.4M–$3.1M",
        range90: "$2.1M–$3.4M",
        assessment: "Management forecast sits above the 90th percentile of the room evidence.",
      },
      {
        id: "c-ns-runway",
        text: "18 months of runway",
        metric: "runway_months",
        kind: "management",
        sourceDocument: "northstar-deck.pdf",
        page: 8,
        sourceType: "management",
        verification: "contradicted",
        confidence: 28,
        supportingIds: [],
        contradictingIds: ["e-ns-cash"],
        managementValue: "18 months",
        recomputedValue: "9 months",
        assessment: "Cash / burn is a fact. The slide is a management assumption.",
      },
      {
        id: "c-ns-tam",
        text: "$48B TAM",
        metric: "tam",
        kind: "management",
        sourceDocument: "northstar-deck.pdf",
        page: 5,
        sourceType: "unverified",
        verification: "unverified",
        confidence: 15,
        supportingIds: [],
        contradictingIds: [],
        managementValue: "$48B",
        benchmarkValue: "No third-party study",
        assessment: "Unsupported. Do not treat as fact.",
      },
    ],
    evidence: [
      {
        id: "e-ns-arr-model",
        claimId: "c-ns-arr",
        text: "Summary sheet ARR = $2.8M",
        sourceDocument: "northstar-financial-model.xlsx",
        location: "Summary",
        sourceType: "primary",
        forOrAgainst: "against",
      },
      {
        id: "e-ns-cash",
        claimId: "c-ns-runway",
        text: "$3.8M cash / $420k burn ≈ 9 months",
        sourceDocument: "northstar-financial-model.xlsx",
        location: "Cash",
        sourceType: "primary",
        forOrAgainst: "against",
      },
      {
        id: "e-ns-tam-missing",
        claimId: "c-ns-tam",
        text: "No market study in the room",
        sourceType: "unverified",
        forOrAgainst: "missing",
      },
    ],
    findings: [
      {
        id: "f-ns-arr",
        title: "ARR contradiction",
        body: "Deck and model disagree by 50%. This is a numbers finding, not a thesis finding.",
        kind: "contradiction",
        claimIds: ["c-ns-arr"],
        evidenceIds: ["e-ns-arr-model"],
      },
    ],
    risks: [
      {
        id: "r-ns-numbers",
        category: "financial",
        description: "Material contradictions on ARR, runway, headcount, and ownership.",
        probability: "high",
        impact: "high",
        materiality: "high",
        evidenceConfidence: 80,
        persistence: "transient",
        timeHorizon: "This raise",
        mitigation: "Restate ARR and send a fully-diluted cap table.",
        status: "open",
        owner: "Simon Kalouche",
        evidenceIds: ["e-ns-arr-model", "e-ns-cash"],
        cluster: "stated-vs-room",
      },
      {
        id: "r-ns-runway",
        category: "execution",
        description: "Nine months of cash against an 18-month hiring plan.",
        probability: "high",
        impact: "high",
        materiality: "high",
        evidenceConfidence: 75,
        persistence: "transient",
        timeHorizon: "9 months",
        status: "open",
        evidenceIds: ["e-ns-cash"],
        cluster: "stated-vs-room",
      },
    ],
    questions: [
      {
        id: "q-arr",
        question: "Which ARR definition produces $4.2M, and can you restate LTM against the model?",
        findingId: "f-ns-arr",
        claimId: "c-ns-arr",
        riskId: "r-ns-numbers",
        reason: "Largest single swing on conviction and valuation.",
        evidenceRequired: "Monthly billed + contracted roll-forward",
        owner: "Simon Kalouche",
        status: "asked",
        deadline: "2026-09-18",
      },
      {
        id: "q-cap",
        question: "Please send the FD cap table that produces 15% founder ownership — or correct the slide.",
        reason: "Ownership is a priced term, not a narrative.",
        evidenceRequired: "Fully diluted cap table",
        owner: "Erik Nieves",
        status: "open",
      },
    ],
    tasks: [
      {
        id: "t-ns-arr",
        title: "Waiting on ARR restatement",
        owner: "Simon Kalouche",
        status: "waiting",
        waitingOn: "Founder — monthly roll-forward",
        kind: "document",
        deadline: "2026-09-18",
      },
      {
        id: "t-ns-cap",
        title: "Request FD cap table",
        owner: "You",
        status: "open",
        kind: "document",
      },
    ],
    meetings: [
      {
        id: "m-ns-1",
        title: "First partner meeting",
        when: "2026-09-04T16:00:00.000Z",
        attendees: ["You", "Simon Kalouche"],
        notes: "They walked the warehouse video. Numbers were not opened.",
      },
    ],
    versions: [
      { id: "ns-deck-2", filename: "northstar-deck.pdf", version: "v2", date: "2026-09-01", note: "Raise slide added 18-month runway", changedValues: ["runway 14 → 18"] },
      { id: "ns-model-1", filename: "northstar-financial-model.xlsx", version: "v1", date: "2026-08-20", note: "Original model", changedValues: [] },
    ],
    assumptions: [
      { id: "a-ns-arr", text: "Deck ARR includes pipeline that is not contracted", source: "agent", usedIn: "ARR reconciliation" },
    ],
    benchmarks: [
      { id: "b-ns-arr", metric: "ARR", value: "$2.1M median", peer: "Warehouse autonomy Series A", note: "External range, not a fact about Northstar." },
    ],
    valuation: {
      entryValuation: "$90M post on $18M",
      revenueMultiple: "32x on deck ARR / 32x on $2.8M is still rich",
      comps: "Locus, Geek+, plus two stealth warehouse A rounds",
      ownership: "~8–10% if we lead $8M — we are not leading",
      dilution: "Expect a B within 12 months if cash is 9 months",
      companyQualityVsPrice: "Company quality is mid. Price assumes the deck ARR is real.",
      attractiveness: 47,
    },
    world: [
      {
        claim: "$48B TAM for warehouse autonomy",
        independent: "Public analyst notes put addressable pallet-mover spend much lower.",
        against: "No study in the room.",
        missing: "Third-party TAM memo",
        assessment: "Management claim. Not a fact.",
        confidence: 20,
      },
    ],
    people: [],
    product: [],
    scoreChanges: [
      {
        id: "sc-ns-init",
        key: "investmentConviction",
        previous: 61,
        next: scores.investmentConviction ?? 52,
        reason: "Four contradictions landed from the room.",
        evidence: "Deck vs model",
        date: created,
        source: "Numbers engine",
      },
    ],
    timeline: [
      {
        id: "tl-ns-room",
        at: created,
        title: "Data room reconciled",
        body: "ARR, runway, headcount, ownership all flag. TAM unsupported.",
        source: "Checklist",
      },
    ],
    nextAction: {
      title: "Request the ARR roll-forward",
      reason: "Highest decision value: if $2.8M is the number, price and hiring plan both break.",
      decisionImpact: "high",
      informationValue: "high",
      cost: "low",
      time: "2 days",
      urgency: "now",
    },
    portfolio: {
      sector: "Fits industrial book. Complements, does not clone, existing automation.",
      stage: "A — on plan.",
      geography: "US.",
      capitalNote: "Smaller check. Reserve for follow-on only if numbers restated.",
      concentration: "Adds robotics density — acceptable.",
      correlation: "Moderate with other industrial names.",
      followOn: "Do not reserve until ARR is restated.",
    },
  };
  return { deal, files: [], copySample: true };
}

export function buildNorthstarDeal(): Deal {
  return structuredClone(northstar().deal);
}

function aether(): { deal: Deal; files: { filename: string; body: string }[] } {
  const profile: CompanyProfile = {
    company: "Aether Grid",
    founders: ["James McGinniss", "William Burke"],
    sector: "Climate / industrial — grid orchestration",
    geography: "EU (Milan) + US customers",
    stage: "Series A",
    fundraise: "Raising $14M Series A at $70M post",
    product: "Orchestration layer for C&I batteries and flexible loads",
    businessModel: "Software + share of ISO revenue",
    traction: "$1.6M ARR, 3 utilities, 1 independent ISO pilot",
    source: "Climate syndicate",
  };
  const created = "2026-08-22T10:00:00.000Z";
  const deal = shell("aether-grid", "Aether Grid", created, "validation");
  const oq = avg(OPP_AETHER);
  const scores = {
    thesisFit: 88,
    opportunityQuality: oq,
    risk: 54,
    uncertainty: 57,
    evidenceConfidence: 51,
    valuationAttractiveness: 63,
    portfolioFit: 81,
    investmentConviction: 0,
  };
  scores.investmentConviction = computeConviction(scores);
  const brief = `# Aether Grid\n\nJames McGinniss (ex-Terna). William Burke (controls).\n$1.6M ARR. 3 utilities. Key-person: James holds the ISO relationships.`;
  deal.docs = [doc(deal.id, "aether-brief.md", "other", "room", brief)];
  deal.intelligence = {
    stage: "validation",
    profile,
    thesis: {
      score: 88,
      matches: [
        { label: "Sector", matches: true, detail: "Climate + industrial infrastructure." },
        { label: "Stage", matches: true, detail: "Series A." },
        { label: "Geography", matches: true, detail: "EU HQ, US customers." },
      ],
      mismatches: [],
      exceptions: [],
      whyItMayStillMatter: "This is an on-thesis deal. The open issue is people, not mandate.",
      hardConstraintWarnings: [],
    },
    scores,
    scoreBreakdown: {
      opportunity: OPP_AETHER,
      convictionNote: "Team score is high and also the risk: the same person is the moat.",
    },
    overrides: [],
    claims: [
      {
        id: "c-ae-moat",
        text: "ISO integrations are a technical moat",
        kind: "management",
        sourceDocument: "aether-brief.md",
        sourceType: "management",
        verification: "partial",
        confidence: 48,
        supportingIds: ["e-ae-iso"],
        contradictingIds: [],
        assessment: "Integrations are real. Switching costs are asserted, not measured.",
      },
    ],
    evidence: [
      {
        id: "e-ae-iso",
        claimId: "c-ae-moat",
        text: "One live ISO pilot, two utilities in production.",
        sourceDocument: "aether-brief.md",
        sourceType: "secondary",
        forOrAgainst: "for",
      },
    ],
    findings: [
      {
        id: "f-ae-key",
        title: "Key-person dependency on James",
        body: "ISO relationships sit with one founder. Product can ship without her; the book of business may not.",
        kind: "risk",
        claimIds: ["c-ae-moat"],
        evidenceIds: ["e-ae-iso"],
      },
    ],
    risks: [
      {
        id: "r-ae-key",
        category: "team",
        description: "Key-person risk: ISO and utility relationships concentrated on James McGinniss.",
        probability: "medium",
        impact: "high",
        materiality: "high",
        evidenceConfidence: 60,
        persistence: "structural",
        timeHorizon: "24 months",
        mitigation: "Hire a second markets lead before close.",
        status: "open",
        owner: "James McGinniss",
        evidenceIds: ["e-ae-iso"],
        cluster: "key-person",
      },
    ],
    questions: [
      {
        id: "q-ae-hire",
        question: "Who is the second person who can sit in an ISO room without James?",
        findingId: "f-ae-key",
        riskId: "r-ae-key",
        reason: "Separates founder-market fit (strength) from key-person (risk).",
        evidenceRequired: "Org plan + named candidate",
        owner: "James McGinniss",
        status: "asked",
      },
    ],
    tasks: [
      {
        id: "t-ae-ref",
        title: "Utility reference calls",
        owner: "You",
        status: "waiting",
        waitingOn: "Two utility operators",
        kind: "diligence",
      },
    ],
    meetings: [
      { id: "m-ae-1", title: "Product walkthrough", when: "2026-08-28T13:00:00.000Z", attendees: ["You", "William Burke"] },
    ],
    versions: [{ id: "ae-1", filename: "aether-brief.md", version: "v1", date: created, note: "Syndicate brief" }],
    assumptions: [],
    benchmarks: [],
    valuation: {
      entryValuation: "$70M post",
      revenueMultiple: "~44x on $1.6M — priced for the grid story",
      comps: "AutoGrid-era comps plus two EU flexibility startups",
      companyQualityVsPrice: "Company quality is ahead of the evidence on switching costs. Price assumes the moat.",
      attractiveness: 63,
    },
    world: [
      {
        claim: "C&I flexibility budgets are expanding in Italy and ERCOT",
        independent: "Public ISO reports show rising participation.",
        against: "Procurement cycles still annual.",
        missing: "Named pipeline with dates",
        assessment: "Directionally supported. Timing is the uncertainty.",
        confidence: 62,
      },
    ],
    people: [
      {
        title: "Founder-market fit",
        claim: "James ran Terna’s flexibility desk.",
        evidence: "Public bio + syndicate note.",
        assessment: "Verified strength. Also the key-person risk.",
      },
      {
        title: "Founder dynamics",
        claim: "William owns product; James owns markets.",
        evidence: "Walkthrough. They finish each other’s sentences.",
        assessment: "Healthy split. Bus factor is still one.",
      },
    ],
    product: [
      {
        title: "Differentiation",
        claim: "Orchestration across batteries and loads, not a single-asset optimizer.",
        evidence: "Demo of mixed portfolio.",
        assessment: "Product looks real. Moat is unproven.",
      },
      {
        title: "Technical debt",
        claim: "Each ISO is a custom connector.",
        evidence: "William said six months per new ISO.",
        assessment: "Scalability risk. Not fatal at A.",
      },
    ],
    scoreChanges: [
      {
        id: "sc-ae-people",
        key: "investmentConviction",
        previous: 71,
        next: scores.investmentConviction ?? 68,
        reason: "Key-person finding after the walkthrough.",
        date: "2026-08-28T16:00:00.000Z",
        source: "People + product",
      },
    ],
    timeline: [
      {
        id: "tl-ae-walk",
        at: "2026-08-28T16:00:00.000Z",
        title: "Product walkthrough",
        body: "Product is real. Moat is a claim. James is the book.",
        source: "People + product",
      },
    ],
    nextAction: {
      title: "Run two utility references",
      reason: "Tests whether the relationship survives without James in the room.",
      decisionImpact: "high",
      informationValue: "high",
      cost: "medium",
      time: "1 week",
      urgency: "this_week",
    },
    portfolio: {
      sector: "Adds climate/grid — desired exposure.",
      stage: "A — on plan.",
      geography: "EU + US. Helps geography mix.",
      capitalNote: "Check fits. Follow-on likely.",
      concentration: "Low. First grid name.",
      correlation: "Low vs robotics.",
      followOn: "Reserve $2M if references clear.",
    },
  };
  return { deal, files: [{ filename: "aether-brief.md", body: brief }] };
}

function helio(): { deal: Deal; files: { filename: string; body: string }[] } {
  const profile: CompanyProfile = {
    company: "Helio Freight",
    founders: ["Bob King", "Austin McCombs", "Charley Dehoney"],
    sector: "B2B infrastructure — freight yield management",
    geography: "United States (Chicago)",
    stage: "Series A",
    fundraise: "Raising $16M Series A at $85M post",
    product: "Yield and empty-mile software for mid-market carriers",
    businessModel: "Per-tractor SaaS + take-rate on recovered empty miles",
    traction: "$4.8M ARR, 136% NRR, 22 carriers",
    source: "Existing portco intro",
  };
  const created = "2026-07-20T09:00:00.000Z";
  const deal = shell("helio-freight", "Helio Freight", created, "decision_room");
  const oq = avg(OPP_HELIO);
  const scores = {
    thesisFit: 86,
    opportunityQuality: oq,
    risk: 46,
    uncertainty: 39,
    evidenceConfidence: 71,
    valuationAttractiveness: 58,
    portfolioFit: 77,
    investmentConviction: 69,
  };
  const memo = `# Helio Freight IC\n\nAdvance with conditions. Restate empty-mile take-rate after two more carrier references.`;
  deal.docs = [doc(deal.id, "helio-ic-draft.md", "other", "room", memo)];
  deal.intelligence = {
    stage: "decision_room",
    profile,
    thesis: {
      score: 86,
      matches: [
        { label: "Sector", matches: true, detail: "B2B infrastructure, budget already exists." },
        { label: "Stage", matches: true, detail: "Series A." },
        { label: "Geography", matches: true, detail: "Chicago / United States." },
        { label: "Business model", matches: true, detail: "Seat + usage. Capital efficient." },
      ],
      mismatches: [
        { label: "Check size", matches: false, detail: "Round is larger than our typical lead. We participate." },
      ],
      exceptions: [],
      whyItMayStillMatter: "On-thesis. Price is the debate, not mandate.",
      hardConstraintWarnings: [],
    },
    scores,
    scoreBreakdown: {
      opportunity: OPP_HELIO,
      convictionNote:
        "Conviction 69 = 0.28·OQ + 0.12·thesis + 0.18·(100−risk) + 0.12·(100−unc) + 0.12·evidence + 0.12·valuation + 0.06·portfolio. This is case strength, not P(invest).",
    },
    overrides: [],
    claims: [
      {
        id: "c-hf-nrr",
        text: "136% NRR",
        metric: "nrr",
        kind: "fact",
        sourceDocument: "helio-cohorts.xlsx",
        sourceType: "primary",
        verification: "verified",
        confidence: 82,
        supportingIds: ["e-hf-cohort"],
        contradictingIds: [],
        managementValue: "136%",
        recomputedValue: "134%",
        benchmarkValue: "118% freight SaaS median",
        range80: "128%–138%",
        assessment: "Fact, recomputed from the cohort sheet.",
      },
      {
        id: "c-hf-take",
        text: "Take-rate on recovered empty miles will hold at 8%",
        kind: "management",
        sourceType: "management",
        verification: "partial",
        confidence: 50,
        supportingIds: [],
        contradictingIds: [],
        managementValue: "8%",
        recomputedValue: "5.5% in the last two logos",
        range80: "4%–7%",
        range90: "3%–8%",
        assessment: "Management assumption sits at the top of the 90% range.",
      },
    ],
    evidence: [
      {
        id: "e-hf-cohort",
        claimId: "c-hf-nrr",
        text: "Cohort workbook, 18 months, 22 carriers.",
        sourceDocument: "helio-cohorts.xlsx",
        sourceType: "primary",
        date: "2026-09-01",
        forOrAgainst: "for",
      },
    ],
    findings: [
      {
        id: "f-hf-take",
        title: "Take-rate assumed at the top of the range",
        body: "NRR is a fact. The 8% take-rate is a management assumption.",
        kind: "gap",
        claimIds: ["c-hf-take"],
        evidenceIds: [],
      },
    ],
    risks: [
      {
        id: "r-hf-take",
        category: "commercial",
        description: "Empty-mile take-rate may compress as carriers professionalize procurement.",
        probability: "medium",
        impact: "medium",
        materiality: "medium",
        evidenceConfidence: 55,
        persistence: "structural",
        timeHorizon: "24 months",
        mitigation: "Two more carrier references; condition the advance on 6%+ observed.",
        status: "watching",
        owner: "You",
        evidenceIds: [],
        cluster: "pricing-power",
      },
      {
        id: "r-hf-comp",
        category: "competitive",
        description: "TMS incumbents could copy the empty-mile module.",
        probability: "medium",
        impact: "medium",
        materiality: "medium",
        evidenceConfidence: 48,
        persistence: "structural",
        timeHorizon: "36 months",
        status: "watching",
        evidenceIds: [],
        cluster: "pricing-power",
      },
    ],
    questions: [
      {
        id: "q-hf-ref",
        question: "Will the last two logos renew at an 8% take-rate?",
        findingId: "f-hf-take",
        claimId: "c-hf-take",
        reason: "Separates company quality from investment attractiveness at this price.",
        evidenceRequired: "Reference calls + contract excerpts",
        owner: "Bob King",
        status: "asked",
        deadline: "2026-09-20",
      },
    ],
    tasks: [
      {
        id: "t-hf-refs",
        title: "Two carrier references",
        owner: "You",
        status: "waiting",
        waitingOn: "Nora to intro Midland and Redline",
        kind: "diligence",
        deadline: "2026-09-20",
      },
      {
        id: "t-hf-legal",
        title: "Light legal on customer contracts",
        owner: "Outside counsel",
        status: "open",
        kind: "diligence",
      },
    ],
    meetings: [
      { id: "m-hf-ic", title: "IC scheduled", when: "2026-09-15T17:00:00.000Z", attendees: ["Partnership"] },
    ],
    versions: [
      { id: "hf-deck-3", filename: "helio-deck.pdf", version: "v3", date: "2026-09-01", note: "NRR restated from 141% to 136%", changedValues: ["NRR 141 → 136"] },
      { id: "hf-model-2", filename: "helio-model.xlsx", version: "v2", date: "2026-09-03", note: "Take-rate sensitivity added" },
    ],
    assumptions: [
      { id: "a-hf-take", text: "8% take-rate holds on new logos", source: "management", usedIn: "Bull and base cases" },
      { id: "a-hf-exit", text: "Exit at 10x ARR in year 6", source: "scenario", usedIn: "Return model" },
    ],
    benchmarks: [
      { id: "b-hf-nrr", metric: "NRR", value: "118%", peer: "Freight SaaS A", note: "Helio is above the median. That is a fact vs a benchmark, not a guarantee." },
    ],
    valuation: {
      entryValuation: "$85M post on $16M",
      revenueMultiple: "17.7x on $4.8M",
      comps: "Four freight-tech A rounds, 12–22x",
      growthAdjusted: "In range if NRR holds; rich if take-rate compresses to 4%",
      ownership: "9.4% on a $8M participate",
      dilution: "Model a 20% B in 22 months",
      futureFinancing: "Path to B on this plan if empty-mile attach continues",
      exitValuation: "Base $480M in year 6",
      potentialReturns: "Base ~3.4x MOIC / ~24% IRR",
      companyQualityVsPrice: "Company quality is high. Attractiveness is only okay at $85M if take-rate slips.",
      attractiveness: 58,
    },
    returns: {
      scenarios: [
        {
          name: "bear",
          moic: 0.7,
          irr: -0.08,
          narrative: "Take-rate 3%, NRR 105%, sold to a TMS at 4x.",
          assumptions: ["Take-rate 3%", "No B raise, flat ARR"],
        },
        {
          name: "base",
          moic: 3.4,
          irr: 0.24,
          narrative: "Take-rate 5.5%, NRR 125%, exit 10x ARR.",
          assumptions: ["Take-rate 5.5%", "Exit year 6"],
        },
        {
          name: "bull",
          moic: 7.1,
          irr: 0.41,
          narrative: "Category pull, 8% holds, strategic at 14x.",
          assumptions: ["Take-rate 8%", "ARR $40M"],
        },
        {
          name: "outlier",
          moic: 12,
          irr: 0.55,
          narrative: "Platform for all mid-market carriers. Rare.",
          assumptions: ["Do not underwrite this"],
        },
      ],
      expectedMoic: 3.1,
      expectedIrr: 0.22,
      pLoss: 0.22,
      p3x: 0.41,
      p10x: 0.08,
      caveat: "These probabilities are scenario weights we assigned, not calibrated frequencies. Do not read them as statistical certainty.",
    },
    world: [
      {
        claim: "Empty miles are a $20B waste pool",
        independent: "BTS and ATRI empty-mile stats support a large waste pool.",
        against: "Software capture rate historically low.",
        missing: "Helio-specific capture vs national empty-mile rate",
        assessment: "Market is real. Capture is the claim.",
        confidence: 68,
      },
    ],
    people: [
      {
        title: "Team",
        claim: "Bob ran yield at a top-20 carrier. Austin built the pricing engine at Flexport.",
        evidence: "References + public bios.",
        assessment: "Verified strength.",
      },
    ],
    product: [
      {
        title: "PMF",
        claim: "Carriers pay and expand.",
        evidence: "136% NRR from primary cohort sheet.",
        assessment: "Product-market fit is the strongest verified fact on the deal.",
      },
    ],
    ic: {
      executiveSummary:
        "Helio is an on-thesis A with verified retention and a priced debate on take-rate. Advance with conditions: two carrier references and a 6%+ observed take-rate on the last four logos.",
      companyOverview:
        "Chicago. Three founders. Yield + empty-mile recovery for mid-market carriers. $4.8M ARR, 22 logos.",
      thesisFit: "86. Sector, stage, geography, model all match. We are a participant, not the lead.",
      opportunityQuality: `${oq}. Driven by traction and scalability. Competitive position is the weakest pillar.`,
      risks: "Take-rate compression and TMS copycat, clustered as pricing-power — do not double-count.",
      uncertainties: "Reference calls outstanding. Legal on contracts not started.",
      evidenceConfidence: "71. NRR is a fact. Take-rate is still a management assumption.",
      valuation: "17.7x. Company quality > investment attractiveness at $85M if take-rate slips.",
      returnScenarios: "Bear 0.7x / base 3.4x / bull 7.1x. Expected ~3.1x on our weights. Not a frequency.",
      portfolioFit: "Adds logistics software. Low correlation with robotics and grid.",
      bullCase: "8% take-rate holds and they become the yield layer for mid-market carriers.",
      bearCase: "Incumbent TMS ships a good-enough empty-mile module; take-rate goes to 3%.",
      keyAssumptions: [
        "8% take-rate is management, not fact",
        "Exit 10x ARR in year 6 (base)",
        "We own 9.4% after this round",
      ],
      openQuestions: [
        "Will Midland and Redline renew at 8%?",
        "Any MFN or termination-for-convenience in the last four contracts?",
      ],
      recommendation: "advance_with_conditions",
      recommendationNote:
        "The AI recommends. The partnership decides. Conditions are references + observed take-rate, not a thesis gate.",
      nextBestAction: "Complete two carrier references before Monday IC.",
    },
    scoreChanges: [
      {
        id: "sc-hf-64",
        key: "investmentConviction",
        previous: null,
        next: 64,
        reason: "First full score after process.",
        date: "2026-08-02T12:00:00.000Z",
        source: "Triage",
      },
      {
        id: "sc-hf-refs",
        key: "investmentConviction",
        previous: 64,
        next: 72,
        reason: "Customer references",
        evidence: "Three carrier calls",
        date: "2026-08-18T12:00:00.000Z",
        source: "Founder loop",
      },
      {
        id: "sc-hf-rev",
        key: "investmentConviction",
        previous: 72,
        next: 62,
        reason: "Revenue discrepancy on empty-mile attach",
        evidence: "Model v2 vs deck v2",
        date: "2026-08-27T12:00:00.000Z",
        source: "Numbers",
      },
      {
        id: "sc-hf-ret",
        key: "investmentConviction",
        previous: 62,
        next: 69,
        reason: "Retention evidence — cohort sheet verified 136% NRR",
        evidence: "helio-cohorts.xlsx",
        date: "2026-09-01T12:00:00.000Z",
        source: "Numbers",
      },
    ],
    timeline: [
      { id: "tl-hf-1", at: "2026-07-20T09:00:00.000Z", title: "Intro from portco", body: "SOURCE.", source: "Inbound" },
      { id: "tl-hf-2", at: "2026-08-02T12:00:00.000Z", title: "Conviction 64", body: "First scored case.", source: "Triage" },
      { id: "tl-hf-3", at: "2026-08-18T12:00:00.000Z", title: "References +8", body: "Three carriers. Conviction 72.", source: "Founder loop" },
      { id: "tl-hf-4", at: "2026-08-27T12:00:00.000Z", title: "Attach discrepancy −10", body: "Conviction 62.", source: "Numbers" },
      { id: "tl-hf-5", at: "2026-09-01T12:00:00.000Z", title: "Retention +7", body: "Conviction 69. Packet opened.", source: "Numbers" },
    ],
    nextAction: {
      title: "Complete two carrier references before IC",
      reason: "Highest remaining decision value on the take-rate condition.",
      decisionImpact: "high",
      informationValue: "high",
      cost: "medium",
      time: "4 days",
      urgency: "now",
    },
    portfolio: {
      sector: "Logistics software. Complements industrial, no overlap with Aether.",
      stage: "A — on plan.",
      geography: "US Midwest. Fine.",
      capitalNote: "$8M participate. Follow-on reserve $2.5M.",
      concentration: "Does not create a single-sector overweight.",
      correlation: "Low vs grid and robotics.",
      followOn: "Yes, if conditions clear.",
    },
  };
  return { deal, files: [{ filename: "helio-ic-draft.md", body: memo }] };
}

export async function seedIntelligence(opts?: { force?: boolean }): Promise<{
  ids: string[];
  created: string[];
}> {
  const thesis = await loadThesis().catch(async () => {
    const next = defaultThesis();
    await saveThesis(next, { skipHistory: true });
    return next;
  });

  const lumenThesis = assessThesis(
    {
      company: "Lumen Health",
      founders: [],
      sector: "clinic-first healthcare",
      geography: "United States",
      stage: "Seed",
      fundraise: "$6M",
      product: "",
      businessModel: "",
      traction: "",
      source: "",
    },
    thesis,
  ).score ?? 46;

  const built = [harbor(), lumen(lumenThesis), aether(), helio()];
  const created: string[] = [];

  for (const item of built) {
    const existing = opts?.force ? null : await loadDeal(item.deal.id);
    if (existing?.intelligence && !opts?.force) continue;

    await mkdir(path.join(dirs().data, item.deal.id, "workspace"), { recursive: true });
    if ("copySample" in item && item.copySample) {
      try {
        await cp(dirs().sample, path.join(dirs().data, item.deal.id, "workspace"), { recursive: true });
      } catch {
        // Sample folder may be incomplete; seeded markdown still stands.
      }
    }
    if (item.files.length) await writeWorkspace(item.deal, item.files);
    await saveDeal(item.deal);
    created.push(item.deal.id);
  }

  return { ids: [...SEED_IDS], created };
}

export async function ensureSeeded(): Promise<void> {
  const missing: string[] = [];
  for (const id of SEED_IDS) {
    const deal = await loadDeal(id);
    if (!deal?.intelligence) missing.push(id);
  }
  if (missing.length) await seedIntelligence();
}
