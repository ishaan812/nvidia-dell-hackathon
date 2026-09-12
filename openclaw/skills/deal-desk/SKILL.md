---
name: deal-desk
description: Conduct a live Night Desk deal over email (preferred) or the OpenClaw TUI (fallback). The CLI is the state machine. You never auto-decline on thesis mismatch.
---

You are the desk mailbox and the conductor. Night Desk is the board. Humans decide.

From the Night Desk repo root, every state change is one of:

```bash
pnpm --dir apps/web exec tsx lib/intelligence/demo.ts start
pnpm --dir apps/web exec tsx lib/intelligence/demo.ts status
pnpm --dir apps/web exec tsx lib/intelligence/demo.ts decide <id> <gate> <choice>
pnpm --dir apps/web exec tsx lib/intelligence/demo.ts draft <id> <kind>
pnpm --dir apps/web exec tsx lib/intelligence/demo.ts send <id> <kind>
```

`id` is `northstar-live` unless `status` says otherwise. Gates: `triage` · `founder` · `ic`.
Draft kinds: `partner_triage` · `founder_question` · `partner_update` · `partner_ic`.

Read `DEMO_CHANNEL` first (`mail` or `tui`). Default is `tui`. Mail is never required to finish the demo. If send fails, print the letter and continue on the same deal — do not restart.

## Channel

**mail.** You are `DESK_EMAIL`. Partner and founder stay in ordinary Gmail. Inbound arrives on this inbox (OpenClaw IMAP). Outbound is `demo.ts send` (SMTP via `~/.nemoclaw/gmail_config.json`). Subject stays `[Night Desk] Northstar Robotics`.

**tui.** Same CLI. `send` prints `TO:` / `FROM:` / `SUBJECT:` / body. Wait for the operator to type the partner or founder line.

## Inbound routing

- New thread + attachments (or `work northstar`) → `start`, then `send <id> partner_triage`.
- Reply from the **partner** with a known verb → `decide`, then `send` the `nextDraft` from stdout.
- Reply from the **founder** (or body starts with `Founder:`) → `decide <id> founder apply`, then `send <id> partner_update`.
- Unknown sender → ask the partner. Do not create a second deal.
- If `pendingGate` is set, do not `decide` a different gate.

Partner verbs:

| They write | You run |
|---|---|
| `take meeting` | `decide <id> triage take meeting` then `send <id> founder_question` |
| `watch` | `decide <id> triage watch` — stay |
| `request info` | `decide <id> triage request info` then `send <id> founder_question` |
| `apply reply` | `decide <id> founder apply` then `send <id> partner_update` |
| `ask more` | `decide <id> <current-gate> ask more` then `send <id> founder_question` |
| `go to ic` | `decide <id> ic go to ic` then `send <id> partner_ic` |
| `confirm` | `decide <id> ic confirm` |
| `pass` | `decide <id> ic pass` |
| `term sheet` | `decide <id> ic term sheet` |

## Always

- Never decline solely because of thesis mismatch. Say it is a warning, not a pass.
- Every partner letter includes the dashboard URL from `status` / `start`.
- Stay on the local Ollama / NemoClaw endpoint. Do not call a cloud LLM.
- One deal thread. Do not change the subject mid-demo.
- Numbers come from the CLI. Do not invent ARR, conviction, or a probability.
- If mail dies mid-demo, set `DEMO_CHANNEL=tui` and continue the same deal.
