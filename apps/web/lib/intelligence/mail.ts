import { readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import tls from "node:tls";
import type { Deal } from "../diligence/types";
import type { DealIntelligence } from "./types";

export const LIVE_DEAL_ID = "northstar-live";
export const MAIL_THREAD = "[Night Desk] Northstar Robotics";

export type DemoChannel = "mail" | "tui";
export type DraftKind = "partner_triage" | "founder_question" | "partner_update" | "partner_ic";

export type MailDraft = {
  kind: DraftKind;
  to: string;
  from: string;
  subject: string;
  body: string;
};

export type MailboxEnv = {
  channel: DemoChannel;
  desk: string;
  partner: string;
  founder: string;
  publicUrl: string;
};

export function mailboxEnv(): MailboxEnv {
  const channel = process.env.DEMO_CHANNEL === "mail" ? "mail" : "tui";
  return {
    channel,
    desk: process.env.DESK_EMAIL ?? "nightdesk.demo@gmail.com",
    partner: process.env.PARTNER_EMAIL ?? "partner@example.com",
    founder: process.env.FOUNDER_EMAIL ?? "maya.demo@gmail.com",
    publicUrl: (process.env.DEMO_PUBLIC_URL ?? "http://127.0.0.1:3000").replace(/\/$/, ""),
  };
}

export function dealUrl(id: string): string {
  return `${mailboxEnv().publicUrl}/deals/${id}`;
}

export function buildDraft(kind: DraftKind, deal: Deal, intel: DealIntelligence): MailDraft {
  const box = mailboxEnv();
  const url = dealUrl(deal.id);
  const company = intel.profile.company;
  const conviction = intel.scores.investmentConviction;
  const flags = deal.flags.slice(0, 2);
  const to = kind === "founder_question" ? box.founder : box.partner;
  const names = intel.profile.founders.join(" and ") || "the founders";
  const first = intel.profile.founders[0]?.split(" ")[0] || "there";
  const prev = priorConviction(intel);
  const flagBits = flags.map((f) => f.comment.replace(/\.$/, "")).slice(0, 2);

  const bodies: Record<DraftKind, string> = {
    partner_triage: [
      "Hi —",
      "",
      `${names} just sent ${company}. ${intel.profile.product || intel.profile.sector}. ${intel.profile.fundraise}.`,
      "",
      intel.thesis.exceptions.length
        ? `This is a thesis exception (${intel.thesis.exceptions[0]?.detail ?? "avoided sector"}). I'm flagging it, not passing it.`
        : "This sits inside the thesis. I wouldn't pass it on fit.",
      flagBits.length
        ? `I haven't walked the numbers with you yet. Two things already look off — ${flagBits.join("; ")}.`
        : "I haven't opened the room yet.",
      "",
      `The book is here if you want to glance: ${url}`,
      "",
      `If you want a first meeting, reply "take meeting". Or "watch" / "request info".`,
    ].join("\n"),
    founder_question: [
      `Hi ${first} —`,
      "",
      "Quick one before we can price this.",
      "",
      `${arrLine(deal, intel)} Could you send the monthly billed + contracted roll-forward that gets you to your number?`,
      "",
      "That's all for now — not looking for a full pack.",
      "",
      "Thanks,",
      "Night Desk",
    ].join("\n"),
    partner_update: [
      "Hi —",
      "",
      intel.founderReplyApplied
        ? `${first} got back. ARR is billed + contracted, so that question is closed. Conviction moved ${prev ?? "—"} → ${conviction ?? "—"}.`
        : `${first} wrote back. I haven't applied it yet.`,
      "Still open: no independent TAM, and the cap table still doesn't match the slide.",
      "",
      `Book: ${url}`,
      "",
      `If you want this in the room, reply "go to ic". Or "ask more".`,
    ].join("\n"),
    partner_ic: [
      "Hi —",
      "",
      "Packet's ready.",
      "",
      intel.ic
        ? `I'd ${labelRec(intel.ic.recommendation).toLowerCase()}. ${intel.ic.recommendationNote}`
        : "I'd advance with conditions — restated model and a clean cap table before we reserve.",
      intel.ic ? `The optimistic read: ${intel.ic.bullCase}` : "",
      intel.ic ? `The bad one: ${intel.ic.bearCase}` : "",
      "",
      `Overview: ${url}?tab=overview`,
      "",
      `Reply "confirm", "pass", or "term sheet". Your call — I'm not assigning a probability.`,
    ]
      .filter(Boolean)
      .join("\n"),
  };

  return {
    kind,
    to,
    from: box.desk,
    subject: MAIL_THREAD,
    body: bodies[kind].replace(/\n{3,}/g, "\n\n").trim() + "\n",
  };
}

export function formatLetter(draft: MailDraft): string {
  return [`Subject: ${draft.subject}`, `From Night Desk  →  ${draft.to}`, "", draft.body].join("\n");
}

export async function deliverDraft(
  draft: MailDraft,
  opts?: { quiet?: boolean },
): Promise<{ channel: DemoChannel; sent: boolean }> {
  const box = mailboxEnv();
  if (box.channel !== "mail") {
    if (!opts?.quiet) process.stdout.write(`${formatLetter(draft)}\n`);
    return { channel: "tui", sent: false };
  }
  const creds = await loadGmailConfig();
  await sendSmtp({
    user: creds.email,
    password: creds.app_password,
    from: draft.from,
    to: draft.to,
    subject: draft.subject,
    body: draft.body,
  });
  return { channel: "mail", sent: true };
}

type GmailConfig = { email: string; app_password: string };

async function loadGmailConfig(): Promise<GmailConfig> {
  const custom = process.env.GMAIL_CONFIG;
  const fallback = path.join(os.homedir(), ".nemoclaw", "gmail_config.json");
  const file = custom || fallback;
  const raw = await readFile(file, "utf8");
  const parsed = JSON.parse(raw) as Partial<GmailConfig>;
  if (!parsed.email || !parsed.app_password) {
    throw new Error(`gmail_config.json at ${file} needs email and app_password`);
  }
  return { email: parsed.email, app_password: parsed.app_password.replace(/\s+/g, "") };
}

async function sendSmtp(opts: {
  user: string;
  password: string;
  from: string;
  to: string;
  subject: string;
  body: string;
}): Promise<void> {
  const socket = tls.connect({ host: "smtp.gmail.com", port: 465, timeout: 20_000 });
  await new Promise<void>((resolve, reject) => {
    socket.once("secureConnect", () => resolve());
    socket.once("error", reject);
    socket.once("timeout", () => reject(new Error("SMTP connect timed out")));
  });

  const read = smtpReader(socket);
  await read.expect(220);
  await smtpCmd(socket, read, `EHLO nightdesk`, 250);
  await smtpCmd(socket, read, "AUTH LOGIN", 334);
  await smtpCmd(socket, read, Buffer.from(opts.user).toString("base64"), 334);
  await smtpCmd(socket, read, Buffer.from(opts.password).toString("base64"), 235);
  await smtpCmd(socket, read, `MAIL FROM:<${opts.from}>`, 250);
  await smtpCmd(socket, read, `RCPT TO:<${opts.to}>`, 250);
  await smtpCmd(socket, read, "DATA", 354);
  const payload = [
    `From: Night Desk <${opts.from}>`,
    `To: ${opts.to}`,
    `Subject: ${opts.subject}`,
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=utf-8",
    "",
    opts.body,
    ".",
  ].join("\r\n");
  socket.write(`${payload}\r\n`);
  await read.expect(250);
  await smtpCmd(socket, read, "QUIT", 221);
  socket.end();
}

function smtpReader(socket: tls.TLSSocket) {
  let buf = "";
  const lines: string[] = [];
  let wait: ((line: string) => void) | null = null;
  socket.on("data", (chunk) => {
    buf += chunk.toString("utf8");
    const parts = buf.split(/\r?\n/);
    buf = parts.pop() ?? "";
    for (const line of parts) {
      if (wait) {
        const next = wait;
        wait = null;
        next(line);
      } else {
        lines.push(line);
      }
    }
  });

  async function nextLine(): Promise<string> {
    if (lines.length) return lines.shift()!;
    return new Promise((resolve) => {
      wait = resolve;
    });
  }

  async function expect(code: number): Promise<string> {
    let line = await nextLine();
    const collected = [line];
    while (/^\d{3}-/.test(line)) {
      line = await nextLine();
      collected.push(line);
    }
    const got = Number(line.slice(0, 3));
    if (got !== code) {
      throw new Error(`SMTP expected ${code}, got: ${collected.join(" | ")}`);
    }
    return collected.join("\n");
  }

  return { expect };
}

async function smtpCmd(
  socket: tls.TLSSocket,
  read: ReturnType<typeof smtpReader>,
  line: string,
  code: number,
) {
  socket.write(`${line}\r\n`);
  await read.expect(code);
}

function arrLine(deal: Deal, intel: DealIntelligence): string {
  const row = deal.graph.rows.find((item) => item.metric === "arr");
  if (row?.deck && row.room) {
    return `Deck ${row.deck} ARR vs model ${row.room}.`;
  }
  const claim = intel.claims.find((item) => item.metric === "arr");
  if (claim?.managementValue && claim.recomputedValue) {
    return `Deck ${claim.managementValue} ARR vs model ${claim.recomputedValue}.`;
  }
  return "Deck $4.2M ARR vs model $2.8M.";
}

function priorConviction(intel: DealIntelligence): number | null {
  const last = [...intel.scoreChanges].reverse().find((item) => item.key === "investmentConviction");
  return last?.previous ?? null;
}

function labelRec(value: string): string {
  if (value === "advance_with_conditions") return "Advance with conditions";
  if (value === "term_sheet") return "Term sheet";
  if (value === "pass") return "Pass";
  if (value === "advance") return "Advance";
  if (value === "watch") return "Watch";
  return value;
}
