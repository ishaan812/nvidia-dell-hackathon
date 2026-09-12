import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { repoRoot } from "../diligence/paths";
import type { ThesisSettings } from "./types";

function thesisDir() {
  return path.join(repoRoot(), "data", "thesis");
}

function currentPath() {
  return path.join(thesisDir(), "current.json");
}

function historyPath(version: number) {
  return path.join(thesisDir(), "history", `v${version}.json`);
}

export function defaultThesis(): ThesisSettings {
  return {
    version: 1,
    updatedAt: "2026-08-01T12:00:00.000Z",
    preferredSectors: ["climate", "industrial", "B2B infrastructure", "robotics", "logistics"],
    avoidedSectors: ["consumer social", "clinic-first healthcare", "gaming"],
    preferredStages: ["Seed", "Series A"],
    preferredGeographies: ["United States", "EU"],
    checkSizeMin: "$500k",
    checkSizeMax: "$3M",
    businessModels: ["B2B", "usage or seat", "hardware-enabled software"],
    founderPreferences: ["domain operators", "repeat technical founders"],
    marketPreferences: ["painful workflow", "budget already exists"],
    growthPreferences: ["efficient growth over paid blitz"],
    capitalEfficiency: ["path to 18+ months runway on this round"],
    hardConstraints: [
      "No clinic-first healthcare services",
      "No consumer social",
      "Must be able to take a $500k–$3M check",
    ],
    softPreferences: [
      "Industrial or climate adjacency",
      "US or EU HQ",
      "Seed or Series A",
    ],
    weights: {
      sector: 24,
      stage: 16,
      geography: 12,
      businessModel: 16,
      founders: 16,
      capital: 16,
    },
    killCriteria: [
      "Fraud or fabricated metrics",
      "Cap table that cannot accept our check",
    ],
    exceptions: [
      "Healthcare tooling that is infrastructure, not a clinic, may be an exception.",
      "A category-defining founder can override a sector miss — flag it, do not auto-pass.",
    ],
  };
}

export async function loadThesis(): Promise<ThesisSettings> {
  try {
    const raw = await readFile(currentPath(), "utf8");
    return JSON.parse(raw) as ThesisSettings;
  } catch {
    const thesis = defaultThesis();
    await saveThesis(thesis, { skipHistory: true });
    return thesis;
  }
}

export async function saveThesis(
  thesis: ThesisSettings,
  opts?: { skipHistory?: boolean },
): Promise<ThesisSettings> {
  const dir = thesisDir();
  await mkdir(path.join(dir, "history"), { recursive: true });
  const current = { ...thesis, updatedAt: new Date().toISOString() };
  if (!opts?.skipHistory) {
    try {
      const prev = JSON.parse(await readFile(currentPath(), "utf8")) as ThesisSettings;
      await writeFile(historyPath(prev.version), JSON.stringify(prev, null, 2));
      current.version = prev.version + 1;
    } catch {
      current.version = thesis.version || 1;
    }
  }
  await writeFile(currentPath(), JSON.stringify(current, null, 2));
  return current;
}
