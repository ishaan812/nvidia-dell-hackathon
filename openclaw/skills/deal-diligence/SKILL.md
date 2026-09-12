---
name: deal-diligence
description: Run first-pass VC diligence on a dropped data room and reply with the IC memo, risk score, and flagged deck.
---

When a founder sends a deck and supporting files, or a folder lands in the deal inbox:

1. Save the files into a directory.
2. From the Night Desk repo run:

```bash
pnpm --dir apps/web exec tsx lib/diligence/cli.ts run <folder>
```

3. Read `outbox/<deal-id>/memo.md` and `outbox/<deal-id>/flags.json`.
4. Reply on the same channel with the risk score, the four (or fewer) highest-severity flags, and a link to the Night Desk deal page.
5. For follow-up questions, use the compare rows in `deal.json` (`graph.rows`) and `flags.json` — cite the source file. Stay inside that deal's workspace.

Do not call a cloud LLM. Inference stays on the NemoClaw / Ollama endpoint already configured for this workspace.
