import { existsSync } from "node:fs";
import { cp, readdir, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { riskScore } from "../diligence/checklist";
import { dirs } from "../diligence/paths";
import { runNamedDeal } from "../diligence/pipeline";
import { buildNorthstar } from "../diligence/sample";
import { isolateDeal } from "../diligence/sandbox";
import { loadDeal, saveDeal } from "../diligence/store";
import type { Deal } from "../diligence/types";
import { claimsFromFlags } from "./fromFlags";
import {
  LIVE_DEAL_ID,
  MAIL_THREAD,
  buildDraft,
  dealUrl,
  deliverDraft,
  formatLetter,
  mailboxEnv,
  type DraftKind,
} from "./mail";
import { assessThesis, computeConviction } from "./scores";
import { applyFounderReply, loadIntelligence, saveIntelligence } from "./store";
import { loadThesis } from "./thesis";
import type {
  CompanyProfile,
  DealIntelligence,
  DealStage,
  IcRecommendation,
  PendingGate,
  PendingGateId,
  TriageOutcome,
} from "./types";

export { LIVE_DEAL_ID };

const PROFILE: CompanyProfile = {
  company: "Northstar Robotics",
  founders: ["Simon Kalouche", "Erik Nieves"],
  sector: "Industrial robotics — warehouse autonomy",
  geography: "United States (Pittsburgh)",
  stage: "Series A",
  fundraise: "Raising $18M Series A at $90M post",
  product: "Autonomous pallet movers for existing warehouses",
  businessModel: "Hardware + annual software",
  traction: "Deck $4.2M ARR; model $2.8M",
  source: "Inbound data room · founder email",
};

type Snapshot = {
  id: string;
  url: string;
  stage: DealStage;
  pendingGate?: PendingGate;
  partnerEmail: string;
  founderEmail: string;
  channel: string;
  conviction?: number;
  nextDraft?: DraftKind;
  flags: number;
};

function snapshot(deal: Deal, nextDraft?: DraftKind): Snapshot {
  const intel = deal.intelligence!;
  const box = mailboxEnv();
  return {
    id: deal.id,
    url: dealUrl(deal.id),
    stage: intel.stage,
    pendingGate: intel.pendingGate,
    partnerEmail: box.partner,
    founderEmail: box.founder,
    channel: box.channel,
    conviction: intel.scores.investmentConviction,
    nextDraft,
    flags: deal.flags.length,
  };
}

function nowIso() {
  return new Date().toISOString();
}

function gateTriage(): PendingGate {
  return {
    id: "triage",
    prompt: "Take a meeting, watch, or request information. A thesis miss is not a decline.",
    options: ["take meeting", "watch", "request info"],
  };
}

function gateFounder(): PendingGate {
  return {
    id: "founder",
    prompt: "Ball is with the founder. Apply the reply to keep moving, or ask more.",
    options: ["apply reply", "ask more"],
  };
}

function gateIcOpen(): PendingGate {
  return {
    id: "ic",
    prompt: "Numbers moved. Take this to IC, or ask for more.",
    options: ["go to ic", "ask more"],
  };
}

function gateIcDecide(): PendingGate {
  return {
    id: "ic",
    prompt: "Take it with a few conditions, pass, or make an offer. Your call.",
    options: ["confirm", "pass", "term sheet"],
  };
}

function waitingAction(kind: "partner" | "founder", reason: string): DealIntelligence["nextAction"] {
  return {
    title: kind === "founder" ? "Waiting on founder email" : "Waiting on partner email",
    reason,
    decisionImpact: "high",
    informationValue: "high",
    cost: "low",
    time: "hours",
    urgency: "now",
  };
}

async function sourceIntel(deal: Deal): Promise<DealIntelligence> {
  const box = mailboxEnv();
  const thesis = assessThesis(PROFILE, await loadThesis());
  return {
    stage: "source",
    profile: PROFILE,
    thesis,
    scores: {},
    pendingGate: gateTriage(),
    mail: {
      thread: MAIL_THREAD,
      partner: box.partner,
      founder: box.founder,
    },
    overrides: [],
    claims: [],
    evidence: [],
    findings: [],
    risks: [],
    questions: [],
    tasks: [
      {
        id: "t-live-triage",
        title: "Waiting on partner email",
        owner: "Partner",
        status: "waiting",
        waitingOn: "Partner — take meeting / watch / request info",
        kind: "internal",
      },
    ],
    meetings: [],
    versions: [],
    assumptions: [],
    benchmarks: [],
    world: [],
    people: [],
    product: [],
    scoreChanges: [],
    timeline: [
      {
        id: `tl-live-in-${Date.now()}`,
        at: nowIso(),
        title: "Inbound captured",
        body: "Founder pack landed. Deal opened at Source. Waiting on the partner.",
        source: "Desk mailbox",
      },
    ],
    nextAction: waitingAction("partner", "Highest decision value is whether this is worth a first meeting."),
  };
}

async function ensureSampleFolder(): Promise<string> {
  const folder = dirs().sample;
  const files = existsSync(folder) ? await readdir(folder) : [];
  const hasDeck = files.some((name) => /northstar-deck\.pdf$/i.test(name));
  if (!hasDeck) await buildNorthstar();
  return folder;
}

async function ingestLive(id: string, source: string): Promise<Deal> {
  if (process.env.DEMO_FAST === "1" || process.env.DEMO_INGEST === "skip") {
    return cloneSeeded(id);
  }
  const timeoutMs = Number(process.env.DEMO_INGEST_MS ?? 90_000);
  try {
    return await withTimeout(runNamedDeal(id, source, "Northstar Robotics"), timeoutMs);
  } catch (error) {
    console.error(`Live ingest fell back (${(error as Error).message})`);
    return cloneSeeded(id);
  }
}

async function cloneSeeded(id: string): Promise<Deal> {
  const { buildNorthstarDeal } = await import("./seed");
  const source = (await loadDeal("northstar-robotics")) ?? buildNorthstarDeal();
  const root = path.join(dirs().data, id);
  await rm(root, { recursive: true, force: true });
  const workspace = path.join(root, "workspace");
  if (source.sandbox?.workspace && existsSync(source.sandbox.workspace)) {
    await cp(source.sandbox.workspace, workspace, { recursive: true });
  } else {
    await isolateDeal(id, await ensureSampleFolder());
  }
  const deal: Deal = {
    ...JSON.parse(JSON.stringify(source)) as Deal,
    id,
    name: "Northstar Robotics",
    company: "Northstar Robotics",
    createdAt: nowIso(),
    updatedAt: nowIso(),
    sourcePath: dirs().sample,
    intelligence: undefined,
    sandbox: { kind: "local", root, workspace },
    events: [
      ...(source.events ?? []),
      { at: nowIso(), stage: "ingest", message: "Reused precomputed Northstar room — flags shown as just-landed" },
    ],
  };
  deal.docs = deal.docs.map((doc) => ({
    ...doc,
    path: path.join(workspace, path.basename(doc.filename)),
  }));
  return deal;
}

async function fallbackBare(id: string): Promise<Deal> {
  const source = await ensureSampleFolder();
  const sandbox = await isolateDeal(id, source);
  return {
    id,
    name: "Northstar Robotics",
    company: "Northstar Robotics",
    status: "ready",
    createdAt: nowIso(),
    updatedAt: nowIso(),
    sourcePath: source,
    docs: [],
    metrics: [],
    flags: [],
    graph: { nodes: [], edges: [], rows: [] },
    events: [],
    sandbox,
  };
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`timed out after ${ms}ms`)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

export async function startDemo(id = LIVE_DEAL_ID): Promise<Snapshot> {
  const source = await ensureSampleFolder();
  await rm(path.join(dirs().data, id), { recursive: true, force: true });
  const deal = await ingestLive(id, source);
  deal.id = id;
  deal.name = "Northstar Robotics";
  deal.company = deal.company || "Northstar Robotics";
  deal.intelligence = await sourceIntel(deal);
  await saveDeal(deal);
  try {
    const { ensureAnnotatedDeck } = await import("../diligence/annotate");
    await ensureAnnotatedDeck(deal);
  } catch (error) {
    console.error("Could not mark the live deck", error);
  }
  return snapshot(deal, "partner_triage");
}

export async function statusDemo(id = LIVE_DEAL_ID): Promise<Snapshot> {
  const loaded = await loadIntelligence(id);
  if (!loaded) throw new Error(`No live deal ${id}. Run start first.`);
  return snapshot(loaded.deal, suggestDraft(loaded.intel));
}

function suggestDraft(intel: DealIntelligence): DraftKind | undefined {
  if (intel.pendingGate?.id === "triage") return "partner_triage";
  if (intel.pendingGate?.id === "founder") return "founder_question";
  if (intel.pendingGate?.id === "ic" && intel.ic) return "partner_ic";
  if (intel.pendingGate?.id === "ic") return "partner_update";
  return undefined;
}

function norm(value: string): string {
  return value.toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
}

function stamp(intel: DealIntelligence, title: string, body: string, source = "Partner") {
  intel.timeline.push({
    id: `tl-${Date.now()}`,
    at: nowIso(),
    title,
    body,
    source,
  });
}

function founderName(intel: DealIntelligence) {
  return intel.profile.founders[0] || "Founder";
}

function attachNumbers(deal: Deal, intel: DealIntelligence) {
  const { claims, evidence } = claimsFromFlags(deal);
  intel.claims = claims;
  intel.evidence = evidence;
  const arr = deal.graph.rows.find((row) => row.metric === "arr");
  const owner = founderName(intel);
  const contradictions = deal.flags.filter((flag) => flag.severity === "contradiction");
  intel.findings = contradictions.length
    ? contradictions.slice(0, 3).map((flag) => ({
        id: `f-${flag.id}`,
        title: flag.metric ? `${flag.metric} contradiction` : "Room contradiction",
        body: flag.comment,
        kind: "contradiction" as const,
        claimIds: claims.filter((c) => c.metric === flag.metric).map((c) => c.id),
        evidenceIds: evidence.filter((e) => e.claimId?.endsWith(flag.id)).map((e) => e.id).slice(0, 1),
      }))
    : [
        {
          id: "f-live-arr",
          title: "ARR contradiction",
          body: arr
            ? `Deck ${arr.deck} vs model ${arr.room}. Numbers finding, not a thesis finding.`
            : "Open the room against the deck before a first meeting closes.",
          kind: "contradiction" as const,
          claimIds: claims.filter((c) => c.metric === "arr").map((c) => c.id),
          evidenceIds: evidence.map((e) => e.id).slice(0, 1),
        },
      ];
  intel.risks = [
    {
      id: "r-live-numbers",
      category: "financial",
      description:
        contradictions[0]?.comment ??
        "Material gaps between the deck and the data room still sit on the operating numbers.",
      probability: "high",
      impact: "high",
      materiality: "high",
      evidenceConfidence: 80,
      persistence: "transient",
      timeHorizon: "This raise",
      mitigation: "Restate the contested numbers and send the missing primary files.",
      status: "open",
      owner,
      evidenceIds: evidence.map((e) => e.id).slice(0, 2),
      cluster: "stated-vs-room",
    },
  ];
  if (!intel.questions.some((q) => q.id === "q-arr")) {
    intel.questions.push({
      id: "q-arr",
      question: arr
        ? `Which ARR definition produces ${arr.deck}, and can you restate LTM against the model ${arr.room}?`
        : "Please restate the numbers the deck cites against the files in the room.",
      findingId: intel.findings[0]?.id,
      reason: "Largest single swing on conviction and valuation.",
      evidenceRequired: "Primary schedule or roll-forward that produces the cited figure",
      owner,
      status: "asked",
    });
  }
  const thesisFit = intel.thesis.score ?? 82;
  const risk = deal.riskScore ?? riskScore(deal.flags);
  const scores = {
    thesisFit,
    opportunityQuality: intel.scores.opportunityQuality ?? 64,
    risk,
    uncertainty: intel.scores.uncertainty ?? 64,
    evidenceConfidence: intel.scores.evidenceConfidence ?? 38,
    valuationAttractiveness: intel.scores.valuationAttractiveness ?? 47,
    portfolioFit: intel.scores.portfolioFit ?? 74,
    investmentConviction: 0,
  };
  scores.investmentConviction = computeConviction(scores);
  intel.scores = scores;
  intel.scoreBreakdown = {
    convictionNote: "Quality of the company is separate from quality of the numbers.",
  };
  if (!intel.people.length) {
    intel.people = [
      {
        title: "Founders",
        claim: intel.profile.founders.join(" and ") || `${intel.profile.company} founding team.`,
        evidence: "Named on the inbound pack.",
        assessment: "Not independently verified this pass.",
      },
    ];
  }
  if (!intel.valuation) {
    intel.valuation = {
      entryValuation: intel.profile.fundraise,
      revenueMultiple: arr ? `Price versus ${arr.room || arr.deck}` : "Price versus the room",
      comps: intel.profile.sector,
      companyQualityVsPrice: "Price assumes the deck numbers hold.",
      attractiveness: scores.valuationAttractiveness,
    };
  }
}

function writeIc(deal: Deal, intel: DealIntelligence) {
  const conviction = intel.scores.investmentConviction ?? 52;
  const arr = deal.graph.rows.find((row) => row.metric === "arr");
  const gaps = deal.flags.filter((flag) => flag.severity === "contradiction" || flag.severity === "missing");
  intel.ic = {
    executiveSummary: gaps.length
      ? `${intel.profile.company}. The room still disagrees with the deck on ${gaps
          .map((flag) => flag.metric || flag.id)
          .slice(0, 3)
          .join(", ")}. Advance only with restated primary files.`
      : `${intel.profile.company}. ${intel.profile.product}. ${intel.profile.fundraise}.`,
    companyOverview: `${intel.profile.product}. ${intel.profile.fundraise}.`,
    thesisFit: intel.thesis.whyItMayStillMatter,
    opportunityQuality: intel.profile.traction || "Traction quality is the open question.",
    risks: intel.risks.map((r) => r.description).join(" ") || gaps.map((flag) => flag.comment).join(" "),
    uncertainties: intel.questions.filter((q) => q.status !== "answered").map((q) => q.question).join(" ") ||
      "Independent corroboration still thin.",
    evidenceConfidence: intel.founderReplyApplied
      ? "Founder restated the contested figure. Other gaps may remain."
      : "Primary files and founder restatement still decide the numbers.",
    valuation: intel.valuation?.companyQualityVsPrice ?? "Price assumes the deck numbers hold.",
    returnScenarios: "Not modeled as a distribution. Do not treat conviction as P(invest).",
    portfolioFit: "Fits as a smaller check until the room is clean.",
    bullCase: arr?.room
      ? `If ${arr.room} is contracted and growing, the raise can hold.`
      : "If the room numbers hold, this is a real meeting.",
    bearCase: arr?.deck
      ? `If ${arr.deck} was pipeline, the plan and the price both break.`
      : "If the deck does not survive the room, do not stretch for it.",
    keyAssumptions: [
      "Restated figures match primary files",
      "We would not lead on this pass",
    ],
    openQuestions: intel.questions.filter((q) => q.status !== "answered").map((q) => q.question),
    recommendation: "advance_with_conditions",
    recommendationNote: `Conviction ${conviction}. Conditions: restated model in the room, missing files landed.`,
    nextBestAction: "The memo is ready. Take the deal, pass, or make an offer.",
  };
  intel.returns = {
    scenarios: [
      { name: "bear", moic: 0.4, narrative: "ARR is pipeline; raise is a bridge.", assumptions: ["Deck ARR does not hold"] },
      { name: "base", moic: 2.2, narrative: "Model ARR holds; we are a small check.", assumptions: ["$2.8M is contracted"] },
      { name: "bull", moic: 5, narrative: "Category pull-through in pallet movers.", assumptions: ["Retention is real"] },
    ],
    caveat: "Scenarios are stories, not a calibrated distribution.",
  };
}

export async function decideDemo(id: string, gate: string, choice: string): Promise<Snapshot> {
  const loaded = await loadIntelligence(id);
  if (!loaded) throw new Error(`No deal ${id}`);
  let { deal, intel } = loaded;
  const token = norm(choice);
  const gateId = norm(gate) as PendingGateId | string;

  if (intel.pendingGate && intel.pendingGate.id !== gateId && !(gateId === "ic" && intel.pendingGate.id === "ic")) {
    throw new Error(`Waiting on ${intel.pendingGate.id}, not ${gateId}. ${intel.pendingGate.prompt}`);
  }

  if (gateId === "triage") {
    if (token === "take meeting" || token === "take_meeting") {
      intel.triage = {
        outcome: "take_meeting" satisfies TriageOutcome,
        note: "Partner took the meeting. Thesis was not a gate.",
      };
      stamp(intel, "Partner: take meeting", "Triage cleared. Validation engines are running.");
      intel.stage = "validation";
      attachNumbers(deal, intel);
      intel.pendingGate = gateFounder();
      intel.nextAction = waitingAction("founder", "Highest decision value is a restatement of the contested numbers.");
      intel.tasks = [
        {
          id: "t-live-arr",
          title: "Waiting on founder restatement",
          owner: founderName(intel),
          status: "waiting",
          waitingOn: "Founder — primary schedule",
          kind: "document",
        },
      ];
      deal.intelligence = intel;
      await saveIntelligence(deal, intel);
      return snapshot(deal, "founder_question");
    }
    if (token === "watch") {
      intel.triage = { outcome: "watch", note: "Parked. Not a thesis auto-pass." };
      stamp(intel, "Partner: watch", "Stays on the blotter. No decline.");
      intel.pendingGate = gateTriage();
      intel.nextAction = waitingAction("partner", "Watching. Reply take meeting when you want to open the room.");
      deal.intelligence = intel;
      await saveIntelligence(deal, intel);
      return snapshot(deal, "partner_triage");
    }
    if (token === "request info" || token === "request information") {
      intel.stage = "process";
      intel.triage = { outcome: "request_information", note: "Ask for the model and cap table before a meeting." };
      stamp(intel, "Partner: request info", "Document request out. Not a decline.");
      intel.pendingGate = gateFounder();
      intel.nextAction = waitingAction("founder", "Waiting on the materials the partner asked for.");
      deal.intelligence = intel;
      await saveIntelligence(deal, intel);
      return snapshot(deal, "founder_question");
    }
    throw new Error("triage choices: take meeting | watch | request info");
  }

  if (gateId === "founder") {
    if (token === "ask more") {
      intel.pendingGate = gateFounder();
      stamp(intel, "Ask more", "Another founder question queued.", "Partner");
      deal.intelligence = intel;
      await saveIntelligence(deal, intel);
      return snapshot(deal, "founder_question");
    }
    if (token === "apply" || token === "apply reply" || token === "apply_reply") {
      const applied = await applyFounderReply(id);
      if (!applied) throw new Error("Could not apply founder reply");
      const again = await loadIntelligence(id);
      if (!again) throw new Error("Deal disappeared after founder reply");
      deal = again.deal;
      intel = again.intel;
      intel.stage = "validation";
      intel.pendingGate = gateIcOpen();
      intel.nextAction = waitingAction("partner", "Conviction moved. Partner decides whether this goes to IC.");
      stamp(intel, "Founder answered", "Reply applied. Conviction moved. Partner decides whether this goes to IC.", "Founder");
      deal.intelligence = intel;
      await saveIntelligence(deal, intel);
      return snapshot(deal, "partner_update");
    }
    throw new Error("founder choices: apply reply | ask more");
  }

  if (gateId === "ic") {
    if (token === "ask more") {
      intel.pendingGate = gateFounder();
      stamp(intel, "Ask more", "Partner wants another founder pass.");
      intel.nextAction = waitingAction("founder", "Waiting on the founder again.");
      deal.intelligence = intel;
      await saveIntelligence(deal, intel);
      return snapshot(deal, "founder_question");
    }
    if (token === "go to ic" || token === "open") {
      intel.stage = "decision_room";
      writeIc(deal, intel);
      intel.pendingGate = gateIcDecide();
      intel.nextAction = {
        title: "The memo is ready. Take the deal, pass, or make an offer.",
        reason: "The numbers are in. This is your call.",
        decisionImpact: "high",
        informationValue: "high",
        cost: "low",
        time: "hours",
        urgency: "now",
      };
      stamp(intel, "Opened Decision Room", "Same engines. The partner decides in the room.");
      deal.intelligence = intel;
      await saveIntelligence(deal, intel);
      return snapshot(deal, "partner_ic");
    }
    const rec = icChoice(token);
    if (!rec) throw new Error("ic choices: go to ic | confirm | pass | term sheet | ask more");
    if (!intel.ic) writeIc(deal, intel);
    const packet = intel.ic;
    if (!packet) throw new Error("IC packet missing");
    packet.recommendation = rec;
    intel.stage = "decision_room";
    intel.pendingGate = undefined;
    intel.nextAction = {
      title: rec === "pass" ? "Send the pass note" : "Record the decision",
      reason: "IC recommendation is attributed to the partner.",
      decisionImpact: "high",
      informationValue: "low",
      cost: "low",
      time: "today",
      urgency: "now",
    };
    stamp(intel, `Partner: ${rec}`, packet.recommendationNote);
    deal.intelligence = intel;
    await saveIntelligence(deal, intel);
    return snapshot(deal);
  }

  throw new Error("gates: triage | founder | ic");
}

function icChoice(token: string): IcRecommendation | null {
  if (
    token === "confirm" ||
    token === "take it" ||
    token === "take the deal" ||
    token === "advance with conditions" ||
    token === "advance_with_conditions"
  ) {
    return "advance_with_conditions";
  }
  if (token === "advance") return "advance";
  if (token === "pass") return "pass";
  if (token === "term sheet" || token === "term_sheet" || token === "make an offer" || token === "offer") {
    return "term_sheet";
  }
  if (token === "watch") return "watch";
  return null;
}

export async function draftDemo(id: string, kind: string): Promise<{ draft: ReturnType<typeof buildDraft>; letter: string }> {
  const loaded = await loadIntelligence(id);
  if (!loaded) throw new Error(`No live deal ${id}`);
  const draftKind = kind as DraftKind;
  if (!["partner_triage", "founder_question", "partner_update", "partner_ic"].includes(draftKind)) {
    throw new Error("kinds: partner_triage | founder_question | partner_update | partner_ic");
  }
  const draft = buildDraft(draftKind, loaded.deal, loaded.intel);
  const intel = loaded.intel;
  intel.mail = {
    thread: MAIL_THREAD,
    partner: mailboxEnv().partner,
    founder: mailboxEnv().founder,
    lastOutbound: draftKind,
  };
  loaded.deal.intelligence = intel;
  await saveIntelligence(loaded.deal, intel);
  return { draft, letter: formatLetter(draft) };
}

export async function sendDemo(id: string, kind: string) {
  const { draft, letter } = await draftDemo(id, kind);
  const result = await deliverDraft(draft);
  return { ...result, letter, to: draft.to, subject: draft.subject };
}

async function main() {
  const [, , cmd, a, b, ...rest] = process.argv;
  const choice = rest.join(" ").trim();
  try {
    if (cmd === "start") {
      console.log(JSON.stringify(await startDemo(a || LIVE_DEAL_ID), null, 2));
      return;
    }
    if (cmd === "status") {
      console.log(JSON.stringify(await statusDemo(a || LIVE_DEAL_ID), null, 2));
      return;
    }
    if (cmd === "decide") {
      const id = a || LIVE_DEAL_ID;
      if (!b || !choice) {
        console.log("usage: demo.ts decide <id> <gate> <choice>");
        process.exit(1);
      }
      console.log(JSON.stringify(await decideDemo(id, b, choice), null, 2));
      return;
    }
    if (cmd === "draft") {
      const id = a || LIVE_DEAL_ID;
      if (!b) {
        console.log("usage: demo.ts draft <id> <kind>");
        process.exit(1);
      }
      const { letter } = await draftDemo(id, b);
      process.stdout.write(`${letter}\n`);
      return;
    }
    if (cmd === "send") {
      const id = a || LIVE_DEAL_ID;
      if (!b) {
        console.log("usage: demo.ts send <id> <kind>");
        process.exit(1);
      }
      const result = await sendDemo(id, b);
      if (result.channel === "mail") {
        console.log(JSON.stringify({ channel: result.channel, sent: result.sent, to: result.to, subject: result.subject }, null, 2));
      }
      return;
    }
    if (cmd === "tui") {
      process.env.DEMO_CHANNEL = process.env.DEMO_CHANNEL || "tui";
      const { runTui } = await import("./tui");
      await runTui(a || LIVE_DEAL_ID);
      return;
    }
    console.log("usage: tsx lib/intelligence/demo.ts start|status|decide|draft|send|tui");
  } catch (error) {
    console.error((error as Error).message);
    process.exit(1);
  }
}

const invoked = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invoked) {
  main();
}
