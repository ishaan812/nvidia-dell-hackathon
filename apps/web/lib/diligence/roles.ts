import path from "node:path";
import type { DocKind, FileRole, IngestedDoc } from "./types";

export function canBeDeck(filename: string) {
  return /\.(pdf|pptx|ppt)$/i.test(filename);
}

export function kindFromName(filename: string, forceRoom = false): DocKind {
  const n = filename.toLowerCase();
  if (!forceRoom && /(deck|pitch|slides)/.test(n) && canBeDeck(n)) return "deck";
  if (/(cap[-_ ]?table|captable|ownership)/.test(n)) return "cap_table";
  if (/(financial|model|pnl|p&l|burn)/.test(n)) return "financials";
  if (/(metric|kpi|cohort)/.test(n)) return "metrics";
  if (/\.(xlsx|xls|csv)$/i.test(n)) return "financials";
  return "other";
}

export function parseRoles(raw: unknown): Record<string, FileRole> {
  if (typeof raw !== "string" || !raw.trim()) return {};
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const roles: Record<string, FileRole> = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (value === "deck" || value === "room") roles[path.basename(key)] = value;
    }
    return roles;
  } catch {
    return {};
  }
}

export function rolesFromDocs(docs: IngestedDoc[]): Record<string, FileRole> {
  const roles: Record<string, FileRole> = {};
  for (const doc of docs) {
    roles[doc.filename] = doc.role ?? (doc.kind === "deck" ? "deck" : "room");
  }
  return roles;
}

export function applyRoles(docs: IngestedDoc[], roles: Record<string, FileRole>) {
  for (const doc of docs) {
    const requested = roles[doc.filename];
    const fallback = doc.role ?? (doc.kind === "deck" ? "deck" : "room");
    let role: FileRole = requested ?? fallback;
    if (role === "deck" && !canBeDeck(doc.filename)) role = "room";
    doc.role = role;
    if (role === "deck") {
      doc.kind = "deck";
    } else if (doc.kind === "deck") {
      doc.kind = kindFromName(doc.filename, true);
    }
  }
}

export function deckDocs(docs: IngestedDoc[]) {
  return docs.filter((doc) => (doc.role ?? doc.kind) === "deck" || doc.kind === "deck");
}
