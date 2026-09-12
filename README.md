# Night Desk

Always-on first-pass VC diligence. A founder drops a deck and a data room; the blotter comes back with a knowledge graph, slide flags, and an IC memo. Everything runs locally in Node.js against Ollama.

## Stack

- Next.js (UI + API)
- `@firecrawl/anydoc` for local parse (pptx / xlsx / pdf / docx)
- Deterministic metric cross-check + vector RAG via `nomic-embed-text`
- Local chat model through an OpenAI-compatible endpoint (Ollama now, NemoClaw on GB10)

## Run

```bash
# Ollama already running — gemma3 is enough to exercise the loop
pnpm --dir apps/web exec tsx lib/diligence/cli.ts sample
pnpm --dir apps/web exec tsx lib/diligence/cli.ts run sample/northstar
pnpm dev
```

Open [http://127.0.0.1:3000](http://127.0.0.1:3000). Use **Run the Northstar sample** or drop files onto the blotter.

On the GB10 box, see [docs/GB10.md](docs/GB10.md).
