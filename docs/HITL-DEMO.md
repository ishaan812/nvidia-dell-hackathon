# OpenClaw human-in-the-loop demo

Preferred channel is **Gmail**. Fallback is the **OpenClaw TUI**. Same CLI, same letters, same Night Desk board.

Leave the five seeded deals on the blotter. The live row is `northstar-live`.

Where the deal is: **Source → Triage → Validation → Process → Decision**. Founder replies are not a stage — they sit in Pending / Questions on every deal. The engines (numbers, world, people, product, IC) still run; they just live under Validation and Decision Room.

## Env (Night Desk)

Addresses only — never the App Password.

```env
DESK_EMAIL=nightdesk.demo@gmail.com
PARTNER_EMAIL=you@gmail.com
FOUNDER_EMAIL=maya.demo@gmail.com
DEMO_CHANNEL=tui
DEMO_PUBLIC_URL=http://127.0.0.1:3000
```

`DEMO_CHANNEL=mail` sends. Anything else prints `TO:` / `SUBJECT:` / body.

`DEMO_FAST=1` skips live ingest and reuses the precomputed Northstar room. Use this if `runDeal` is slow. Flip `DEMO_INGEST=live` to force a real parse.

## CLI

```bash
pnpm --dir apps/web exec tsx lib/intelligence/demo.ts start
pnpm --dir apps/web exec tsx lib/intelligence/demo.ts status
pnpm --dir apps/web exec tsx lib/intelligence/demo.ts decide northstar-live triage take meeting
pnpm --dir apps/web exec tsx lib/intelligence/demo.ts send northstar-live founder_question
pnpm --dir apps/web exec tsx lib/intelligence/demo.ts decide northstar-live founder apply reply
pnpm --dir apps/web exec tsx lib/intelligence/demo.ts decide northstar-live ic go to ic
pnpm --dir apps/web exec tsx lib/intelligence/demo.ts decide northstar-live ic confirm
```

Gates stop the bot. Thesis mismatch never auto-passes.

## Preferred — mailbox on the GB10 box

Service is **Gmail**. Sign-in is a 16-character **App Password**, not OAuth, not the Cursor Gmail MCP.

1. New Google account. Enable 2-Step Verification. Enable IMAP. Create an App Password named `openclaw`.
2. On the box:

```bash
nemoclaw my-assistant policy add gmail --yes
```

3. Write `~/.nemoclaw/gmail_config.json` (mode `600`), outside the repo:

```json
{
  "email": "nightdesk.demo@gmail.com",
  "app_password": "<16-character-app-password>"
}
```

4. Point OpenClaw IMAP at `imap.gmail.com:993`. Allowlist the partner and founder. Set `senderAuth.min` to `unverified` for two Gmails mailing each other. The IMAP plugin only reads. Example account:

```json5
{
  host: "imap.gmail.com",
  port: 993,
  secure: true,
  user: "nightdesk.demo@gmail.com",
  mailbox: "INBOX",
  allowedSenders: ["you@gmail.com", "maya.demo@gmail.com"],
  senderAuth: { min: "unverified" },
}
```
5. Outbound is `demo.ts send` → `smtp.gmail.com:465` with the same file.
6. Copy `openclaw/skills/deal-desk` into the OpenClaw workspace `skills/` folder.
7. `DEMO_CHANNEL=mail` and launch:

```bash
ollama launch openclaw --model nemotron3:33b
pnpm dev
```

Partner and founder stay signed into their own Gmail in a browser. They never sign into OpenClaw. Revoke the App Password after the hackathon.

Rehearse one inbound and one outbound before the slot.

## Live TUI (both inboxes)

One terminal is the whole demo. Left pane is the partner inbox, right pane is the founder inbox, the rail is the book. Switch roles and play every verb.

```bash
DEMO_FAST=1 pnpm --dir apps/web exec tsx lib/intelligence/demo.ts tui
```

Keep [http://127.0.0.1:3000](http://127.0.0.1:3000) open on the other screen — it still polls.

| Key | Who | What |
|---|---|---|
| `1` | you | Become the partner |
| `2` | you | Become the founder |
| `3` | you | Become the desk |
| `t` | partner | take meeting |
| `w` | partner | watch |
| `i` | partner | request info |
| `a` | founder | apply ARR reply |
| `g` | partner | go to IC |
| `c` / `p` | partner | confirm / pass |
| `n` | desk | send the next letter into the right inbox |
| `r` | desk | reset `northstar-live` |
| `q` | — | quit |

The TUI never sends Gmail. Letters land in the panes. The pipeline on the site still moves.

## Fallback — TUI, no mailbox

```env
DEMO_CHANNEL=tui
```

Copy `deal-desk` into OpenClaw `skills/`. Say `work northstar`. The skill runs `start`, prints the triage letter, and waits for you to type `take meeting` / `go to ic` / `confirm`. Night Desk polls every 3s so the projector moves.

If mail fails mid-demo, flip `DEMO_CHANNEL=tui` and continue the same deal. Do not restart.

## Eight-minute script

| Beat | Mail / TUI | Human | Night Desk |
|---|---|---|---|
| 0 | Founder → desk | Send the Northstar pack (or `start`) | New **Live** row at Source |
| 1 | Desk → partner | Open the book | Overview fills |
| 2 | Partner → desk | `take meeting` | Process, then Numbers |
| 3 | Desk → founder | ARR question | Waiting on founder email |
| 4 | Founder → desk | Restatement (or Apply the ARR reply) | Conviction +5 |
| 5 | Desk → partner | Update + link | Waiting on partner email |
| 6 | Partner → desk | `go to ic` | Stage → IC |
| 7 | Desk → partner | Packet | Decision tab |
| 8 | Partner → desk | `confirm` | Close |

Skip a live WORLD crawl. One line is enough: independent TAM still unsupported.
