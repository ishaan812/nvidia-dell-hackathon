import { spawn } from "node:child_process";
import { startDemo } from "./demo";
import { mailboxEnv } from "./mail";

const C = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  aqua: "\x1b[38;5;87m",
  mint: "\x1b[38;5;121m",
  paper: "\x1b[38;5;255m",
  mute: "\x1b[38;5;145m",
  wait: "\x1b[38;5;229m",
  line: "\x1b[38;5;66m",
  from: "\x1b[38;5;152m",
  bg: "\x1b[48;5;17m",
  bgOff: "\x1b[49m",
};

type Letter = {
  fromName: string;
  from: string;
  toName: string;
  to: string;
  subject: string;
  body: string;
};

type Hit = { id: "send" | "rewrite" | "quit" | "open"; x: number; y: number; w: number; h: number };

function founderLetter(): Letter {
  const box = mailboxEnv();
  return {
    fromName: "Maya Chen",
    from: box.founder,
    toName: "Acme VC",
    to: box.desk,
    subject: "Northstar Robotics — Series A materials",
    body: [
      "Hi Acme VC —",
      "",
      "Sending the Northstar pack for a first look.",
      "",
      "We're warehouse autonomy — pallet movers for existing buildings.",
      "Raising $18M Series A at $90M post.",
      "",
      "Attached",
      "  northstar-deck.pdf",
      "  northstar-financial-model.xlsx",
      "  northstar-cap-table.xlsx",
      "  GROUND_TRUTH.md",
      "",
      "Happy to walk ARR and the raise whenever you want time.",
      "",
      "Maya",
      "Northstar Robotics",
    ].join("\n"),
  };
}

export async function runTui(id = "northstar-live") {
  process.env.DEMO_CHANNEL = "tui";
  if (process.env.DEMO_FAST == null) process.env.DEMO_FAST = "1";

  let letter = founderLetter();
  let sent = false;
  let sentAt = "";
  let dealUrl = "";
  let flash = "Click Send, or press Enter.";
  let busy = false;
  let hits: Hit[] = [];
  let input = "";

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
    const nextHits: Hit[] = [];
    const rule = `${C.line}${"─".repeat(width)}${C.reset}`;
    const stamp = sent
      ? `${C.mint}${C.bold}Sent${C.reset}  ${C.mute}${sentAt}${C.reset}  ${C.aqua}deal opened${C.reset}`
      : `${C.wait}Draft${C.reset}`;

    lines.push("");
    lines.push(
      g +
        `${C.bold}${C.paper}Night Desk${C.reset}  ${C.dim}·${C.reset}  ${C.aqua}inbound${C.reset}  ${C.dim}·${C.reset}  ${C.mute}founder → Acme VC${C.reset}`,
    );
    lines.push(g + `${C.mute}Maya’s note to the firm. Send it and the bot opens the deal.${C.reset}`);
    lines.push(g + rule);
    lines.push(g + stamp);
    lines.push("");
    lines.push(g + field("From", `${letter.fromName}  <${letter.from}>`));
    lines.push(g + field("To", `${letter.toName}  <${letter.to}>`));
    lines.push(g + field("Subject", letter.subject));
    lines.push(g + rule);
    lines.push("");
    for (const line of wrap(letter.body, width)) {
      lines.push(g + `${C.paper}${line}${C.reset}`);
    }
    if (sent && dealUrl) {
      lines.push("");
      const label = `On the book  ${dealUrl}`;
      lines.push(g + `${C.mute}On the book${C.reset}  ${C.aqua}${link(dealUrl)}${C.reset}`);
      mark(nextHits, "open", gutter, lines.length, Math.min(width, label.length));
    }

    lines.push("");
    if (!sent) {
      const sendLabel = "  Send to Acme VC  ";
      const sendPad = Math.max(0, Math.floor((width - sendLabel.length) / 2));
      lines.push(
        g +
          " ".repeat(sendPad) +
          `\x1b[48;5;87m\x1b[38;5;17m${C.bold}${sendLabel}${C.reset}${C.bg}`,
      );
      mark(nextHits, "send", gutter + sendPad, lines.length, sendLabel.length);
    }

    while (lines.length < rows - 5) lines.push("");
    lines.push(g + rule);
    if (sent) {
      const again = "R write it again";
      const quit = "Q quit";
      lines.push(g + `${C.mute}${again}     ${quit}${C.reset}`);
      mark(nextHits, "rewrite", gutter, lines.length, again.length);
      mark(nextHits, "quit", gutter + again.length + 5, lines.length, quit.length);
    } else {
      const send = "Click Send";
      const again = "R rewrite";
      const quit = "Q quit";
      lines.push(
        g +
          `${C.bold}${C.aqua}${send}${C.reset}    ${C.mute}${again}     ${quit}${C.reset}`,
      );
      mark(nextHits, "send", gutter, lines.length, send.length);
      mark(nextHits, "rewrite", gutter + send.length + 4, lines.length, again.length);
      mark(nextHits, "quit", gutter + send.length + 4 + again.length + 5, lines.length, quit.length);
    }
    lines.push(g + `${busy ? C.wait : C.mute}${flash}${C.reset}`);
    hits = nextHits;

    tty.write(`\x1b[H\x1b[J${C.bg}`);
    tty.write(lines.slice(0, rows).join("\n"));
    tty.write(C.bgOff);
    if (lines.length < rows) tty.write("\n");
  }

  async function sendInbound() {
    flash = "OpenClaw is opening the room…";
    paint();
    const snap = await startDemo(id);
    sent = true;
    sentAt = clock();
    dealUrl = snap.url;
    flash = "Deal is on the book. Click the link, or open Pipeline.";
  }

  async function act(fn: () => Promise<void>) {
    if (busy) return;
    busy = true;
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

  function click(x: number, y: number) {
    const hit = hits.find((item) => x >= item.x && x < item.x + item.w && y >= item.y && y < item.y + item.h);
    if (!hit) return;
    if (hit.id === "quit") {
      shutdown();
      return;
    }
    if (hit.id === "rewrite") {
      letter = founderLetter();
      sent = false;
      sentAt = "";
      dealUrl = "";
      flash = "Click Send, or press Enter.";
      paint();
      return;
    }
    if (hit.id === "open" && dealUrl) {
      openUrl(dealUrl);
      flash = "Opened the deal in the browser.";
      paint();
      return;
    }
    if (hit.id === "send") {
      if (sent || busy) return;
      void act(sendInbound);
    }
  }

  function onKey(key: string) {
    if (key === "\u0003" || key === "q" || key === "Q") {
      shutdown();
      return;
    }
    if (key === "r" || key === "R") {
      letter = founderLetter();
      sent = false;
      sentAt = "";
      dealUrl = "";
      flash = "Click Send, or press Enter.";
      paint();
      return;
    }
    if (key === "\r" || key === "\n" || key === " " || key === "s" || key === "S") {
      if (sent || busy) return;
      void act(sendInbound);
    }
  }

  function onData(chunk: string) {
    input += chunk;
    while (input) {
      if (input.startsWith("\x1b[<")) {
        const match = input.match(/^\x1b\[<(\d+);(\d+);(\d+)([Mm])/);
        if (!match) {
          if (input.length > 24) input = input.slice(1);
          break;
        }
        input = input.slice(match[0].length);
        if (match[4] === "M" && match[1] === "0") click(Number(match[2]), Number(match[3]));
        continue;
      }
      if (input.startsWith("\x1b")) {
        const csi = input.match(/^\x1b\[[0-9;?]*[A-Za-z]/) || input.match(/^\x1b.][^\x07]*(\x07|\x1b\\)/);
        if (csi) {
          input = input.slice(csi[0].length);
          continue;
        }
        if (input.length < 3) break;
        input = input.slice(1);
        continue;
      }
      const ch = input[0]!;
      input = input.slice(1);
      onKey(ch);
    }
  }

  function shutdown() {
    stdin.setRawMode?.(false);
    stdin.pause();
    tty.write(`\x1b[?1000l\x1b[?1006l\x1b[?1049l\x1b[?25h${C.reset}`);
    process.exit(0);
  }

  tty.write("\x1b[?1049h\x1b[?25l\x1b[?1000h\x1b[?1006h");
  stdin.setRawMode?.(true);
  stdin.resume();
  stdin.setEncoding("utf8");
  stdin.on("data", onData);
  process.on("SIGWINCH", () => paint());
  process.on("SIGINT", shutdown);

  paint();
}

function mark(hits: Hit[], id: Hit["id"], gutter: number, lineCount: number, width: number) {
  hits.push({ id, x: gutter + 1, y: lineCount, w: Math.max(1, width), h: 1 });
}

function field(label: string, value: string) {
  return `${C.mute}${label.padEnd(8)}${C.reset}${C.from}${value}${C.reset}`;
}

function clock() {
  return new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function link(url: string) {
  return `\x1b]8;;${url}\x1b\\${url}\x1b]8;;\x1b\\`;
}

function openUrl(url: string) {
  const cmd = process.platform === "darwin" ? "open" : "xdg-open";
  spawn(cmd, [url], { stdio: "ignore", detached: true }).unref();
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
