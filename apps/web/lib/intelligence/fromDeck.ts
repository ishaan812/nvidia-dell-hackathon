import { chat } from "../diligence/llm";
import type { Deal } from "../diligence/types";
import type { CompanyProfile } from "./types";

type DeckExtract = {
  founders?: string[] | null;
  sector?: string | null;
  product?: string | null;
  geography?: string | null;
  stage?: string | null;
  fundraise?: string | null;
  businessModel?: string | null;
};

function blank(value?: string | null): boolean {
  if (!value) return true;
  return /^(unknown|n\/?a|none|tbd)(\b|$)/i.test(value.trim()) || /inbound room/i.test(value);
}

function deckText(deal: Deal): string {
  const decks = deal.docs.filter((doc) => doc.role === "deck" || doc.kind === "deck");
  const src = decks.length ? decks : deal.docs;
  return src
    .map((doc) => doc.markdown)
    .join("\n\n")
    .replace(/<!--.*?-->/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 14000);
}

function parseExtract(raw: string): DeckExtract | null {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(raw.slice(start, end + 1)) as DeckExtract;
  } catch {
    return null;
  }
}

function cleanNames(values?: string[] | null): string[] {
  if (!values) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of values) {
    const name = raw.replace(/\s+/g, " ").replace(/^dr\.?\s+/i, "Dr. ").trim();
    const key = name.toLowerCase();
    if (!name || name.length < 4 || name.length > 60) continue;
    if (/\d|@|http/i.test(name)) continue;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(name);
  }
  return out.slice(0, 4);
}

export function hasNamedFounders(profile: CompanyProfile): boolean {
  return profile.founders.some((name) => name.trim().length > 2);
}

export function hasMarketSignal(deal: Deal, profile: CompanyProfile): boolean {
  if (!blank(profile.sector) && !/inbound room/i.test(profile.sector)) return true;
  if (!blank(profile.product) && profile.product.trim().toLowerCase() !== profile.company.trim().toLowerCase()) {
    return true;
  }
  return deal.flags.some((flag) => flag.metric === "tam") || deal.metrics.some((metric) => metric.name === "tam");
}

export async function fillProfileFromDeck(deal: Deal, profile: CompanyProfile): Promise<CompanyProfile> {
  const text = deckText(deal);
  if (text.length < 80) return profile;

  const raw = await chat(
    [
      {
        role: "system",
        content:
          "Extract only facts written in the inbound deck. Do not invent people, sectors, cities, or raise terms. If a field is not stated, return null. Founders means people named as founder, co-founder, CEO/CTO who founded — not VP, head of, or advisors. Return JSON only.",
      },
      {
        role: "user",
        content: `Company on the folder: ${profile.company}\n\nDeck:\n${text}\n\nJSON shape:\n{"founders":["Full Name"]|null,"sector":"short sector"|null,"product":"what they sell"|null,"geography":"city or country"|null,"stage":"Pre-seed|Seed|Series A|Series B"|null,"fundraise":"raise line"|null,"businessModel":"how they charge"|null}`,
      },
    ],
    { maxTokens: 400 },
  );
  const extracted = parseExtract(raw);
  if (!extracted) return profile;

  const founders = cleanNames(extracted.founders);
  const pick = (value?: string | null, fallback = "") => {
    const next = value?.replace(/\s+/g, " ").trim() ?? "";
    return blank(next) ? fallback : next.slice(0, 160);
  };

  return {
    ...profile,
    founders: founders.length ? founders : profile.founders,
    sector: pick(extracted.sector, profile.sector),
    product: pick(extracted.product, profile.product),
    geography: pick(extracted.geography, profile.geography),
    stage: pick(extracted.stage, profile.stage),
    fundraise: pick(extracted.fundraise, profile.fundraise),
    businessModel: pick(extracted.businessModel, profile.businessModel),
  };
}
