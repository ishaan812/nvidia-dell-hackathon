export const DEAL_STAGES = [
  "source",
  "triage",
  "validation",
  "process",
  "decision_room",
] as const;

export type DealStage = (typeof DEAL_STAGES)[number];

export const STAGE_LABELS: Record<DealStage, string> = {
  source: "Source",
  triage: "Triage",
  validation: "Validation",
  process: "Process",
  decision_room: "Decision",
};

const LEGACY_STAGES: Record<string, DealStage> = {
  numbers: "validation",
  world: "validation",
  people_product: "validation",
  founder_loop: "validation",
  ic: "decision_room",
  close_pass: "decision_room",
};

export function normalizeStage(stage: string | undefined | null): DealStage {
  if (stage && (DEAL_STAGES as readonly string[]).includes(stage)) return stage as DealStage;
  if (stage && LEGACY_STAGES[stage]) return LEGACY_STAGES[stage];
  return "source";
}

export type ClaimKind = "fact" | "management" | "benchmark" | "agent" | "scenario";
export type SourceRank = "primary" | "secondary" | "management" | "unverified";
export type VerificationStatus = "verified" | "partial" | "unverified" | "contradicted";
export type RiskCategory =
  | "market"
  | "product"
  | "commercial"
  | "financial"
  | "team"
  | "legal"
  | "thesis"
  | "execution"
  | "competitive";
export type QuestionStatus = "open" | "asked" | "answered" | "insufficient" | "closed";
export type TaskStatus = "open" | "waiting" | "done";
export type TriageOutcome = "take_meeting" | "request_information" | "watch" | "decline";
export type IcRecommendation =
  | "advance"
  | "advance_with_conditions"
  | "watch"
  | "pass"
  | "thesis_exception"
  | "term_sheet";

export type ScoreKey =
  | "thesisFit"
  | "opportunityQuality"
  | "risk"
  | "uncertainty"
  | "evidenceConfidence"
  | "valuationAttractiveness"
  | "portfolioFit"
  | "investmentConviction";

export const SCORE_LABELS: Record<ScoreKey, string> = {
  thesisFit: "Thesis fit",
  opportunityQuality: "Opportunity",
  risk: "Risk",
  uncertainty: "Uncertainty",
  evidenceConfidence: "Evidence",
  valuationAttractiveness: "Valuation",
  portfolioFit: "Portfolio fit",
  investmentConviction: "Conviction",
};

export type ScoreSet = Partial<Record<ScoreKey, number>>;

export type ScoreOverride = {
  key: ScoreKey;
  value: number;
  reason: string;
  at: string;
};

export type CompanyProfile = {
  company: string;
  founders: string[];
  sector: string;
  geography: string;
  stage: string;
  fundraise: string;
  product: string;
  businessModel: string;
  traction: string;
  source: string;
};

export type ThesisFitItem = {
  label: string;
  matches: boolean;
  detail: string;
};

export type ThesisAssessment = {
  score?: number;
  matches: ThesisFitItem[];
  mismatches: ThesisFitItem[];
  exceptions: ThesisFitItem[];
  whyItMayStillMatter: string;
  hardConstraintWarnings: string[];
};

export type OpportunityBreakdown = {
  market: number;
  product: number;
  team: number;
  traction: number;
  businessModel: number;
  financialQuality: number;
  competitivePosition: number;
  scalability: number;
  exitPotential: number;
};

export type Claim = {
  id: string;
  text: string;
  metric?: string;
  kind: ClaimKind;
  sourceDocument?: string;
  page?: number;
  location?: string;
  sourceType: SourceRank;
  date?: string;
  verification: VerificationStatus;
  confidence: number;
  supportingIds: string[];
  contradictingIds: string[];
  managementValue?: string;
  recomputedValue?: string;
  benchmarkValue?: string;
  range80?: string;
  range90?: string;
  assessment?: string;
};

export type Evidence = {
  id: string;
  claimId?: string;
  text: string;
  sourceDocument?: string;
  page?: number;
  location?: string;
  sourceType: SourceRank;
  date?: string;
  forOrAgainst: "for" | "against" | "missing";
};

export type Finding = {
  id: string;
  title: string;
  body: string;
  kind: "strength" | "risk" | "gap" | "contradiction" | "thesis_exception";
  claimIds: string[];
  evidenceIds: string[];
};

export type Risk = {
  id: string;
  category: RiskCategory;
  description: string;
  probability: "low" | "medium" | "high";
  impact: "low" | "medium" | "high";
  materiality: "low" | "medium" | "high";
  evidenceConfidence: number;
  persistence: "transient" | "structural";
  timeHorizon: string;
  mitigation?: string;
  status: "open" | "watching" | "mitigated";
  owner?: string;
  evidenceIds: string[];
  cluster?: string;
};

export type Question = {
  id: string;
  question: string;
  findingId?: string;
  claimId?: string;
  riskId?: string;
  reason: string;
  evidenceRequired: string;
  owner: string;
  status: QuestionStatus;
  deadline?: string;
};

export type Task = {
  id: string;
  title: string;
  owner: string;
  status: TaskStatus;
  waitingOn?: string;
  deadline?: string;
  kind: "meeting" | "document" | "question" | "diligence" | "internal";
};

export type Meeting = {
  id: string;
  title: string;
  when?: string;
  attendees: string[];
  notes?: string;
};

export type DocumentVersion = {
  id: string;
  filename: string;
  version: string;
  date: string;
  note: string;
  changedValues?: string[];
};

export type Assumption = {
  id: string;
  text: string;
  source: ClaimKind;
  usedIn: string;
};

export type Benchmark = {
  id: string;
  metric: string;
  value: string;
  peer: string;
  note: string;
};

export type Scenario = {
  name: "bear" | "base" | "bull" | "outlier";
  moic?: number;
  irr?: number;
  narrative: string;
  assumptions: string[];
};

export type ReturnModel = {
  scenarios: Scenario[];
  expectedMoic?: number;
  expectedIrr?: number;
  pLoss?: number;
  p3x?: number;
  p10x?: number;
  caveat: string;
};

export type Valuation = {
  entryValuation?: string;
  revenueMultiple?: string;
  comps: string;
  growthAdjusted?: string;
  ownership?: string;
  dilution?: string;
  futureFinancing?: string;
  exitValuation?: string;
  potentialReturns?: string;
  companyQualityVsPrice: string;
  attractiveness?: number;
};

export type ScoreChange = {
  id: string;
  key: ScoreKey;
  previous: number | null;
  next: number | null;
  reason: string;
  evidence?: string;
  date: string;
  source: string;
};

export type TimelineEvent = {
  id: string;
  at: string;
  title: string;
  body: string;
  source?: string;
};

export type IcMemo = {
  executiveSummary: string;
  companyOverview: string;
  thesisFit: string;
  opportunityQuality: string;
  risks: string;
  uncertainties: string;
  evidenceConfidence: string;
  valuation: string;
  returnScenarios: string;
  portfolioFit: string;
  bullCase: string;
  bearCase: string;
  keyAssumptions: string[];
  openQuestions: string[];
  recommendation: IcRecommendation;
  recommendationNote: string;
  nextBestAction: string;
};

export type WorldClaim = {
  claim: string;
  independent: string;
  against: string;
  missing: string;
  assessment: string;
  confidence: number;
};

export type PeopleProductNote = {
  title: string;
  claim: string;
  evidence: string;
  assessment: string;
};

export type NextAction = {
  title: string;
  reason: string;
  decisionImpact: "high" | "medium" | "low";
  informationValue: "high" | "medium" | "low";
  cost: "low" | "medium" | "high";
  time: string;
  urgency: "now" | "this_week" | "later";
};

export type StageSnapshot = {
  entryCriteria: string[];
  expectedInputs: string[];
  expectedDocuments: string[];
  aiChecks: string[];
  openQuestions: string[];
  requiredActions: string[];
  exitCriteria: string[];
  nextStates: DealStage[];
};

export type PortfolioExposure = {
  sector: string;
  stage: string;
  geography: string;
  capitalNote: string;
  concentration: string;
  correlation: string;
  followOn: string;
};

export type PendingGateId = "triage" | "founder" | "ic";

export type PendingGate = {
  id: PendingGateId;
  prompt: string;
  options: string[];
};

export type DealMail = {
  thread: string;
  partner: string;
  founder: string;
  lastOutbound?: string;
};

export type DealIntelligence = {
  stage: DealStage;
  profile: CompanyProfile;
  thesis: ThesisAssessment;
  scores: ScoreSet;
  pendingGate?: PendingGate;
  mail?: DealMail;
  scoreBreakdown?: {
    opportunity?: OpportunityBreakdown;
    convictionNote: string;
  };
  overrides: ScoreOverride[];
  claims: Claim[];
  evidence: Evidence[];
  findings: Finding[];
  risks: Risk[];
  questions: Question[];
  tasks: Task[];
  meetings: Meeting[];
  versions: DocumentVersion[];
  assumptions: Assumption[];
  benchmarks: Benchmark[];
  valuation?: Valuation;
  returns?: ReturnModel;
  world: WorldClaim[];
  people: PeopleProductNote[];
  product: PeopleProductNote[];
  ic?: IcMemo;
  scoreChanges: ScoreChange[];
  timeline: TimelineEvent[];
  nextAction: NextAction;
  triage?: {
    outcome: TriageOutcome;
    note: string;
  };
  portfolio?: PortfolioExposure;
  founderReplyApplied?: boolean;
};

export type ThesisSettings = {
  version: number;
  updatedAt: string;
  preferredSectors: string[];
  avoidedSectors: string[];
  preferredStages: string[];
  preferredGeographies: string[];
  checkSizeMin: string;
  checkSizeMax: string;
  businessModels: string[];
  founderPreferences: string[];
  marketPreferences: string[];
  growthPreferences: string[];
  capitalEfficiency: string[];
  hardConstraints: string[];
  softPreferences: string[];
  weights: Partial<Record<string, number>>;
  killCriteria: string[];
  exceptions: string[];
};

export const PIPELINE_SCORE_KEYS: ScoreKey[] = [
  "thesisFit",
  "opportunityQuality",
  "risk",
  "uncertainty",
  "evidenceConfidence",
  "valuationAttractiveness",
  "investmentConviction",
];
