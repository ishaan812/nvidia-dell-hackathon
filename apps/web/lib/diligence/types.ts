export type Severity = "contradiction" | "unsupported" | "missing";
export type FlagType = "highlight" | "note" | "area";
export type DocKind = "deck" | "financials" | "cap_table" | "metrics" | "other";
export type FileRole = "deck" | "room";
export type DealStatus =
  | "received"
  | "ingesting"
  | "graphing"
  | "diligence"
  | "annotating"
  | "ready"
  | "error";

export type Citation = {
  filename: string;
  page?: number;
  sheet?: string;
  label?: string;
};

export type OcrWord = {
  t: string;
  x: number;
  y: number;
  w: number;
  h: number;
};

export type NormBox = {
  x: number;
  y: number;
  w: number;
  h: number;
};

export type IngestedDoc = {
  docId: string;
  filename: string;
  kind: DocKind;
  role: FileRole;
  path: string;
  markdown: string;
  pageTexts: Record<number, string>;
  pageWords?: Record<number, OcrWord[]>;
};

export type Metric = {
  name: string;
  value: number;
  unit: "usd" | "months" | "people" | "pct";
  raw: string;
  sourceKind: DocKind;
  citation: Citation;
};

export type Flag = {
  id: string;
  docId: string;
  page: number | null;
  type: FlagType;
  severity: Severity;
  comment: string;
  sourceCitation: string;
  quote: string;
  metric?: string;
  sourceFile?: string;
  sourceSheet?: string;
  deckValue?: string;
  roomValue?: string;
  box?: NormBox;
};

export type PreviewRow = {
  cells: string[];
  hit: boolean;
};

export type PreviewSheet = {
  name: string;
  rows: PreviewRow[];
};

export type SourcePreview = {
  filename: string;
  kind: "sheet" | "text" | "missing" | "doc";
  sheet?: string;
  highlight?: string;
  rows?: PreviewRow[];
  sheets?: PreviewSheet[];
  paragraphs?: string[];
  excerpt?: string;
  html?: string;
};

export type WorkbookCell = {
  text: string;
  align?: "left" | "right" | "center";
  bold?: boolean;
  fill?: string;
};

export type WorkbookSheet = {
  name: string;
  columns: { width: number }[];
  rows: { cells: WorkbookCell[] }[];
};

export type WorkbookGrid = {
  filename: string;
  sheets: WorkbookSheet[];
};

export type FlagView = Flag & {
  label: string;
  source?: SourcePreview;
};

export type GraphNode = {
  id: string;
  type: string;
  label: string;
  value?: string;
  source?: string;
  severity?: Severity;
};

export type GraphEdge = {
  source: string;
  target: string;
  rel: string;
  severity?: Severity;
};

export type ReconcileStatus =
  | "match"
  | "contradiction"
  | "unsupported"
  | "deck-only"
  | "room-only"
  | "gap";

export type ReconcileRow = {
  metric: string;
  label: string;
  deck?: string;
  room?: string;
  roomSource?: string;
  status: ReconcileStatus;
  comment?: string;
  flagId?: string;
  page?: number | null;
};

export type KnowledgeGraph = {
  nodes: GraphNode[];
  edges: GraphEdge[];
  rows: ReconcileRow[];
};

export type DealSandbox = {
  kind: "local";
  root: string;
  workspace: string;
};

export type Memo = {
  title: string;
  company: string;
  riskScore: number;
  verdict: string;
  summary: string;
  flaggedItems: string[];
  openQuestions: string[];
  bodyMarkdown: string;
};

export type DealEvent = {
  at: string;
  stage: string;
  message: string;
};

export type { DealIntelligence, DealStage } from "../intelligence/types";

export type Deal = {
  id: string;
  name: string;
  company: string;
  status: DealStatus;
  createdAt: string;
  updatedAt: string;
  sourcePath: string;
  error?: string;
  docs: IngestedDoc[];
  metrics: Metric[];
  flags: Flag[];
  graph: KnowledgeGraph;
  memo?: Memo;
  riskScore?: number;
  events: DealEvent[];
  deckFilename?: string;
  deckFilenames?: string[];
  sandbox?: DealSandbox;
  intelligence?: import("../intelligence/types").DealIntelligence;
};

export type DealSummary = {
  id: string;
  name: string;
  company: string;
  status: DealStatus;
  createdAt: string;
  updatedAt: string;
  riskScore?: number;
  flagCounts: Record<Severity, number>;
  docCount: number;
  error?: string;
  deckFilename?: string;
  stage?: import("../intelligence/types").DealStage;
  thesisException?: boolean;
  thesisFit?: number;
  opportunityQuality?: number;
  uncertainty?: number;
  evidenceConfidence?: number;
  valuationAttractiveness?: number;
  investmentConviction?: number;
  nextAction?: string;
  lastActivity?: string;
};

export type DealFile = {
  filename: string;
  kind: DocKind;
  role: FileRole;
  sheets: string[];
  metrics: string[];
  href: string;
};

export type FileLink = {
  metric: string;
  label: string;
  deckFile?: string;
  roomFile?: string;
  roomSheet?: string;
  deckValue?: string;
  roomValue?: string;
  status: ReconcileStatus;
  flagId?: string;
};

export type DealRoomView = {
  id: string;
  name: string;
  company: string;
  status: DealStatus;
  riskScore?: number;
  sandbox?: DealSandbox;
  flags: FlagView[];
  memo?: Pick<Memo, "verdict" | "bodyMarkdown">;
  reconcile: ReconcileRow[];
  files: { filename: string; kind: DocKind; role: FileRole }[];
  decks: { filename: string }[];
  activeDeck?: string;
};

export type DealLobbyView = {
  id: string;
  name: string;
  company: string;
  status: DealStatus;
  riskScore?: number;
  decks: DealFile[];
  room: DealFile[];
  links: FileLink[];
  reconcile: ReconcileRow[];
  graph: KnowledgeGraph;
  previews: Record<string, SourcePreview>;
};
