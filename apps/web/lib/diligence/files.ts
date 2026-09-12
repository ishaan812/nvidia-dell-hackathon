import { existsSync } from "node:fs";
import path from "node:path";
import { repoRoot } from "./paths";

export function resolveExisting(filePath: string, filename?: string): string | null {
  const candidates = [
    filePath,
    path.resolve(filePath),
    path.resolve(repoRoot(), filePath),
    path.resolve(process.cwd(), filePath),
    filename ? path.join(repoRoot(), "sample", "northstar", filename) : "",
    filename ? path.join(repoRoot(), "sample", filename) : "",
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (existsSync(candidate)) return candidate;
  }
  return null;
}
