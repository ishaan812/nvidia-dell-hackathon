import { decideDemo, draftDemo, startDemo, statusDemo } from "./demo";
import { mailboxEnv } from "./mail";
import { loadIntelligence } from "./store";
import { DEAL_STAGES, STAGE_LABELS, type DealStage } from "./types";

type Role = "partner" | "founder" | "desk";

type Inbox = {
  title: string;
  empty: string;
  letters: string[];
};

const C = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  aqua: "\x1b[38;5;87m",
  sea: "\x1b[38;5;49m",
  mint: "\x1b[38;5;121m",
  deep: "\x1b[38;5;44m",
  ink: "\x1b[38;5;255m",
  mute: "\x1b[38;5;152m",
  wait: "\x1b[38;5;229m",
  paper: "\x1b[38;5;195m",
  bg: "\x1b[48;5;23m",
  bgOff: "\x1b[49m",
};

export async function runTui(id = "northstar-live") {
  process.env.DEMO_CHANNEL = "tui";
  if (process.env.DEMO_FAST == null) process.env.DEMO_FAST = "1";

  const box = mailboxEnv();
  const inboxes: Record<"partner" | "founder", Inbox> = {
    partner: { title: `Partner inbox`, empty: "Nothing here yet. The desk writes first.", letters: [] },
    founder: { title: `Founder inbox`, empty: "Quiet. Take a meeting, then we write Maya.", letters: [] },
  };

  let role: Role = "partner";
  let flash = "You are the partner. Next: press T to take the meeting.";
  let busy = false;

  const tty = process.stdout;
  const stdin = process.stdin;

  function size() {
    return { cols: tty.columns || 100, rows: tty.rows || 32 };
  }

  let paintGen = 0;
  async function paint() {
    const mine = ++paintGen;
    const { cols, rows } = size();
    const inner = Math.max(60, cols - 2);
    const half = Math.max(28, Math.floor((inner - 3) / 2));
    const lines: string[] = [];
    try {
      const snap = await statusDemo(id);
      if (mine !== paintGen) return;
      const loaded = await loadIntelligence(id).catch(() => null);
      if (mine !== paintGen) return;
      const intel = loaded?.intel;
      const stage = snap.stage;
      const waiting =
        snap.pendingGate?.id === "founder"
          ? "Waiting on founder"
          : snap.pendingGate
            ? "Waiting on partner"
            : stage === "decision_room" && !snap.pendingGate
              ? "Decision recorded"
              : "Idle";
      const conv = snap.conviction == null ? "—" : String(snap.conviction);

      lines.push(`${C.bg}${C.bold}${C.aqua}${pad(`  Night Desk  ·  both inboxes live`, inner)}${C.reset}`);
      lines.push(
        row(
          inner,
          `${C.bold}${C.paper}Northstar Robotics${C.reset}   ${C.aqua}${STAGE_LABELS[stage]}${C.reset}   conviction ${C.bold}${C.mint}${conv}${C.reset}   ${toneWait(waiting)}`,
        ),
      );
      lines.push(row(inner, `${C.mute}${snap.url}${C.reset}`));
      lines.push(row(inner, rail(stage)));
      lines.push(bar(inner));

      const leftH = Math.max(8, rows - 16);
      const partnerBox = pane(inboxes.partner, half, leftH, role === "partner");
      const founderBox = pane(inboxes.founder, half, leftH, role === "founder");
      for (let i = 0; i < leftH; i++) {
        lines.push(`${partnerBox[i] ?? pad("", half)} ${founderBox[i] ?? pad("", half)}`);
      }

      lines.push(bar(inner, roleLine(role)));
      const events = (intel?.timeline ?? []).slice(-3);
      if (events.length) {
        for (const event of events) {
          lines.push(row(inner, `${C.dim}${event.title}${C.reset}  ${C.mute}${event.body}${C.reset}`));
        }
      } else {
        lines.push(row(inner, `${C.mute}Nothing has happened yet. Press T after you read the left inbox.${C.reset}`));
      }
      if (intel?.pendingGate) {
        lines.push(
          row(
            inner,
            `${C.wait}${nextHint(role, intel.pendingGate.id)}${C.reset}`,
          ),
        );
      }
      lines.push(bar(inner));
      lines.push(row(inner, keys(role, snap.pendingGate?.id)));
      lines.push(row(inner, `${busy ? C.wait : C.mint}${flash}${C.reset}`));

      tty.write(`\x1b[H\x1b[J${lines.slice(0, rows - 1).join("\n")}\n`);
    } catch (error) {
      if (mine !== paintGen) return;
      tty.write(`\x1b[H\x1b[J${(error as Error).message}\nPress n or r to start a live deal.\n`);
    }
  }

  async function deliverNext(kind?: string) {
    const snap = await statusDemo(id).catch(() => null);
    const next = kind || snap?.nextDraft;
    if (!next) return;
    const { draft, letter } = await draftDemo(id, next);
    const side = draft.kind === "founder_question" ? "founder" : "partner";
    inboxes[side].letters.push(letter);
    if (inboxes[side].letters.length > 3) inboxes[side].letters.shift();
    flash = `Desk → ${side}: ${draft.subject}`;
  }

  async function boot() {
    flash = "Opening the live deal…";
    paint();
    try {
      await statusDemo(id);
    } catch {
      await startDemo(id);
    }
    if (!inboxes.partner.letters.length) {
      try {
        await deliverNext("partner_triage");
      } catch {
        // Deal may already be past triage.
      }
    }
    flash = "You are the partner. Read the left inbox, then press T.";
    paint();
  }

  async function act(fn: () => Promise<void>) {
    if (busy) return;
    busy = true;
    flash = "Working…";
    paint();
    try {
      await fn();
    } catch (error) {
      flash = (error as Error).message;
    } finally {
      busy = false;
      paint();
    }
  }

  function onKey(key: string) {
    if (key === "\u0003" || key === "q") {
      shutdown();
      return;
    }
    if (key === "1") {
      role = "partner";
      flash = "You are the partner. Take the meeting with T, or watch with W.";
      paint();
      return;
    }
    if (key === "2") {
      role = "founder";
      flash = "You are Maya. Press A to send the ARR restatement.";
      paint();
      return;
    }
    if (key === "3") {
      role = "desk";
      flash = "You are the desk. N sends the next letter. R starts over.";
      paint();
      return;
    }
    if (key === "n") {
      void act(async () => {
        try {
          await statusDemo(id);
        } catch {
          await startDemo(id);
        }
        await deliverNext();
      });
      return;
    }
    if (key === "r") {
      void act(async () => {
        inboxes.partner.letters = [];
        inboxes.founder.letters = [];
        await startDemo(id);
        await deliverNext("partner_triage");
        role = "partner";
        flash = "Fresh inbound. You are the partner — press T when you've read the note.";
      });
      return;
    }

    const verbs: Record<string, { gate: string; choice: string; as: Role; after?: string }> = {
      t: { gate: "triage", choice: "take meeting", as: "partner", after: "founder_question" },
      w: { gate: "triage", choice: "watch", as: "partner" },
      i: { gate: "triage", choice: "request info", as: "partner", after: "founder_question" },
      a: { gate: "founder", choice: "apply reply", as: "founder", after: "partner_update" },
      m: { gate: "founder", choice: "ask more", as: "founder", after: "founder_question" },
      g: { gate: "ic", choice: "go to ic", as: "partner", after: "partner_ic" },
      c: { gate: "ic", choice: "confirm", as: "partner" },
      p: { gate: "ic", choice: "pass", as: "partner" },
      y: { gate: "ic", choice: "term sheet", as: "partner" },
    };
    const verb = verbs[key];
    if (!verb) return;
    if (role !== verb.as && role !== "desk") {
      flash = `Switch to ${verb.as} (press ${verb.as === "partner" ? "1" : "2"}) to send that.`;
      paint();
      return;
    }
    void act(async () => {
      const snap = await decideDemo(id, verb.gate, verb.choice);
      inboxes[verb.as === "founder" ? "founder" : "partner"].letters.push(
        `YOU (${verb.as})\n\n${verb.choice}\n`,
      );
      if (verb.after) await deliverNext(verb.after);
      else if (snap.nextDraft) await deliverNext(snap.nextDraft);
      flash =
        snap.pendingGate?.id === "founder"
          ? "Maya has mail. Press 2, then A to reply."
          : snap.pendingGate?.id === "ic"
            ? snap.nextDraft === "partner_ic"
              ? "Packet is in the partner inbox. Press 1, then C to confirm."
              : "Conviction moved. Press 1, then G to open Decision Room."
            : snap.stage === "decision_room" && !snap.pendingGate
              ? "Done. Decision is on the book."
              : `Sent: ${verb.choice}.`;
    });
  }

  function shutdown() {
    stdin.setRawMode?.(false);
    stdin.pause();
    tty.write("\x1b[?1049l\x1b[?25h");
    process.exit(0);
  }

  tty.write("\x1b[?1049h\x1b[?25l");
  stdin.setRawMode?.(true);
  stdin.resume();
  stdin.setEncoding("utf8");
  stdin.on("data", (chunk: string) => onKey(chunk));
  process.on("SIGWINCH", () => paint());
  process.on("SIGINT", shutdown);

  await boot();
  setInterval(() => {
    if (!busy) paint();
  }, 2000);
}

function toneWait(text: string) {
  if (text.startsWith("Waiting")) return `${C.wait}${text}${C.reset}`;
  if (text.startsWith("Decision")) return `${C.mint}${text}${C.reset}`;
  return `${C.mute}${text}${C.reset}`;
}

function roleLine(role: Role) {
  if (role === "partner") return "You are the partner";
  if (role === "founder") return "You are Maya (founder)";
  return "You are the desk";
}

function nextHint(role: Role, gate: string) {
  if (role === "partner" && gate === "triage") return "Your move: press T to take the meeting";
  if (role === "founder" && gate === "founder") return "Your move: press A to send the ARR reply";
  if (role === "partner" && gate === "ic") return "Your move: press G for Decision Room, then C to confirm";
  if (role === "desk") return "Press N to drop the next letter in the right inbox";
  return "Switch role with 1 / 2 / 3, then take the highlighted key";
}

function rail(current: DealStage) {
  return DEAL_STAGES.map((stage) => {
    const label = STAGE_LABELS[stage];
    const i = DEAL_STAGES.indexOf(stage);
    const c = DEAL_STAGES.indexOf(current);
    if (stage === current) return `${C.bold}${C.aqua}● ${label}${C.reset}`;
    if (i < c) return `${C.sea}✓ ${label}${C.reset}`;
    return `${C.dim}○ ${label}${C.reset}`;
  }).join("  ");
}

function keys(role: Role, gate?: string) {
  const mark = (active: boolean, text: string) =>
    active ? `${C.bold}${C.aqua}${text}${C.reset}` : `${C.dim}${text}${C.reset}`;
  return [
    mark(role === "partner", "1 partner"),
    mark(role === "founder", "2 Maya"),
    mark(role === "desk", "3 desk"),
    " ",
    mark(role === "partner" && gate === "triage", "T take meeting"),
    mark(role === "partner" && gate === "triage", "W watch"),
    mark(role === "founder" && gate === "founder", "A send reply"),
    mark(role === "partner" && gate === "ic", "G decision room"),
    mark(role === "partner" && gate === "ic", "C confirm"),
    mark(role === "partner" && gate === "ic", "P pass"),
    mark(role === "desk", "N send"),
    `${C.mute}R reset   Q quit${C.reset}`,
  ].join("  ");
}

function pane(inbox: Inbox, width: number, height: number, you: boolean): string[] {
  const title = you ? `${inbox.title}  · you are here` : inbox.title;
  const out: string[] = [bar(width, title)];
  const body = inbox.letters.length ? inbox.letters[inbox.letters.length - 1] : inbox.empty;
  const wrapped = wrap(body, width - 2).slice(0, height - 2);
  while (wrapped.length < height - 2) wrapped.push("");
  for (const line of wrapped) {
    out.push(row(width, you ? line : `${C.dim}${line}${C.reset}`));
  }
  out.push(bar(width));
  return out;
}

function wrap(text: string, width: number): string[] {
  const lines: string[] = [];
  for (const raw of text.replace(/\r/g, "").split("\n")) {
    if (!raw) {
      lines.push("");
      continue;
    }
    let rest = raw;
    while (rest.length > width) {
      let cut = rest.lastIndexOf(" ", width);
      if (cut < 10) cut = width;
      lines.push(rest.slice(0, cut));
      rest = rest.slice(cut).trimStart();
    }
    lines.push(rest);
  }
  return lines;
}

function visibleLen(text: string) {
  return text.replace(/\x1b\[[0-9;]*m/g, "").length;
}

function pad(text: string, width: number) {
  const extra = width - visibleLen(text);
  return extra > 0 ? text + " ".repeat(extra) : text;
}

function bar(width: number, title?: string) {
  if (!title) return `${C.deep}${"─".repeat(width)}${C.reset}`;
  const label = ` ${title} `;
  const rest = Math.max(0, width - visibleLen(label));
  return `${C.sea}${label}${C.deep}${"─".repeat(rest)}${C.reset}`;
}

function row(width: number, text: string) {
  return pad(text, width);
}
