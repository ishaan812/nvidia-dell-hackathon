import { draftDemo, startDemo, statusDemo } from "./demo";
import { mailboxEnv, type MailDraft } from "./mail";

const C = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  aqua: "\x1b[38;5;87m",
  sea: "\x1b[38;5;49m",
  mint: "\x1b[38;5;121m",
  paper: "\x1b[38;5;255m",
  mute: "\x1b[38;5;145m",
  wait: "\x1b[38;5;229m",
  line: "\x1b[38;5;66m",
  from: "\x1b[38;5;152m",
  bg: "\x1b[48;5;17m",
  bgOff: "\x1b[49m",
};

export async function runTui(id = "northstar-live") {
  process.env.DEMO_CHANNEL = "tui";
  if (process.env.DEMO_FAST == null) process.env.DEMO_FAST = "1";

  const box = mailboxEnv();
  let draft: MailDraft | null = null;
  let sent = false;
  let sentAt = "";
  let flash = "Writing the first note…";
  let busy = false;

  const tty = process.stdout;
  const stdin = process.stdin;

  function size() {
    return { cols: Math.max(72, tty.columns || 100), rows: Math.max(24, tty.rows || 32) };
  }

  function paint() {
    const { cols, rows } = size();
    const width = Math.min(88, cols - 4);
    const gutter = Math.max(0, Math.floor((cols - width) / 2));
    const g = " ".repeat(gutter);
    const lines: string[] = [];

    const rule = `${C.line}${"─".repeat(width)}${C.reset}`;
    const stamp = sent ? `${C.mint}${C.bold}Sent${C.reset}  ${C.mute}${sentAt}${C.reset}` : `${C.wait}Draft${C.reset}`;

    lines.push("");
    lines.push(
      g +
        `${C.bold}${C.paper}Night Desk${C.reset}  ${C.dim}·${C.reset}  ${C.aqua}first note${C.reset}  ${C.dim}·${C.reset}  ${C.mute}Northstar Robotics${C.reset}`,
    );
    lines.push(g + `${C.mute}OpenClaw  →  partner inbox${C.reset}`);
    lines.push(g + rule);
    lines.push(g + stamp);
    lines.push("");

    if (draft) {
      lines.push(g + field("From", `Night Desk  <${draft.from}>`));
      lines.push(g + field("To", draft.to));
      lines.push(g + field("Subject", draft.subject));
      lines.push(g + rule);
      lines.push("");
      for (const line of wrap(draft.body.trim(), width)) {
        lines.push(g + `${C.paper}${line}${C.reset}`);
      }
    } else {
      lines.push(g + `${C.mute}Opening the inbound pack…${C.reset}`);
    }

    while (lines.length < rows - 5) lines.push("");
    lines.push(g + rule);
    lines.push(
      g +
        (sent
          ? `${C.mute}R rewrite the note     Q quit${C.reset}`
          : `${C.bold}${C.aqua}Enter${C.reset} ${C.paper}send${C.reset}    ${C.mute}R rewrite     Q quit${C.reset}`),
    );
    lines.push(g + `${busy ? C.wait : C.mute}${flash}${C.reset}`);

    tty.write(`\x1b[H\x1b[J${C.bg}`);
    tty.write(lines.slice(0, rows).join("\n"));
    tty.write(C.bgOff);
    if (lines.length < rows) tty.write("\n");
  }

  async function writeFirstNote() {
    try {
      await statusDemo(id);
    } catch {
      await startDemo(id);
    }
    const { draft: next } = await draftDemo(id, "partner_triage");
    draft = next;
    sent = false;
    sentAt = "";
    flash = `To ${box.partner}. Read it, then send.`;
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
    if (key === "\u0003" || key === "q" || key === "Q") {
      shutdown();
      return;
    }
    if (key === "r" || key === "R") {
      void act(writeFirstNote);
      return;
    }
    if (key === "\r" || key === "\n" || key === " " || key === "s" || key === "S") {
      if (!draft || sent || busy) return;
      sent = true;
      sentAt = clock();
      flash = "On the partner desk.";
      paint();
    }
  }

  function shutdown() {
    stdin.setRawMode?.(false);
    stdin.pause();
    tty.write(`\x1b[?1049l\x1b[?25h${C.reset}`);
    process.exit(0);
  }

  tty.write("\x1b[?1049h\x1b[?25l");
  stdin.setRawMode?.(true);
  stdin.resume();
  stdin.setEncoding("utf8");
  stdin.on("data", (chunk: string) => {
    for (const key of chunk) onKey(key);
  });
  process.on("SIGWINCH", () => paint());
  process.on("SIGINT", shutdown);

  paint();
  await act(writeFirstNote);
}

function field(label: string, value: string) {
  return `${C.mute}${label.padEnd(8)}${C.reset}${C.from}${value}${C.reset}`;
}

function clock() {
  return new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
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
      if (cut < 12) cut = width;
      lines.push(rest.slice(0, cut));
      rest = rest.slice(cut).trimStart();
    }
    lines.push(rest);
  }
  return lines;
}
