import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";

export function repoRoot(): string {
  if (process.env.ROOT_DIR) return path.resolve(process.env.ROOT_DIR);
  let dir = process.cwd();
  for (let i = 0; i < 8; i++) {
    if (
      existsSync(path.join(dir, ".env.example")) ||
      existsSync(path.join(dir, "sample"))
    ) {
      return dir;
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return path.resolve(process.cwd(), "../..");
}

export function dirs() {
  const root = repoRoot();
  const paths = {
    root,
    inbox: path.join(root, "inbox"),
    outbox: path.join(root, "outbox"),
    data: path.join(root, "data", "deals"),
    staging: path.join(root, "data", "staging"),
    sample: path.join(root, "sample", "northstar"),
  };
  for (const dir of [paths.inbox, paths.outbox, paths.data, paths.staging, paths.sample]) {
    mkdirSync(dir, { recursive: true });
  }
  return paths;
}

export function settings() {
  return {
    llmBaseUrl: process.env.LLM_BASE_URL ?? "http://127.0.0.1:11434/v1",
    llmApiKey: process.env.LLM_API_KEY ?? "ollama",
    llmModel: process.env.LLM_MODEL ?? "gemma3:latest",
    embeddingModel: process.env.EMBEDDING_MODEL ?? "nomic-embed-text",
    diligenceModel: "gemma3:latest",
  };
}

export function modelDisplayName(id = settings().llmModel): string {
  if (/muse[-_]?glimmer|glimmer[-_]?muse/i.test(id)) return "Muse Glimmer";
  if (/gemma/i.test(id)) return "Gemma";
  return id.replace(/:latest$/, "");
}

export function citationLabel(c: {
  filename: string;
  page?: number;
  sheet?: string;
  label?: string;
}): string {
  return [c.filename, c.sheet, c.page ? `slide ${c.page}` : "", c.label]
    .filter(Boolean)
    .join(" · ");
}
