import type { Deal } from "./types";
import { firecrawlScrapePage, firecrawlSearch, type SearchHit } from "./firecrawl";
import { attachFounderPhotos } from "./founderPhoto";
import { chat } from "./llm";
import { settings } from "./paths";
import { hasMarketSignal } from "../intelligence/fromDeck";
import type { FounderResearch, FounderSpike, MarketInsight, MarketResearch, ResearchHit } from "../intelligence/types";

export async function researchFounders(deal: Deal): Promise<FounderResearch[]> {
  const intel = deal.intelligence;
  if (!intel) return [];
  if (!intel.profile.founders.length) return [];
  const names = intel.profile.founders;
  const people: FounderResearch[] = [];
  for (const name of names) {
    const hits = await enrichHits(await searchFounderHits(name, intel.profile.company, intel.profile.sector), 2);
    people.push(await assessFounder(name, intel.profile.company, intel.profile.sector, hits));
  }
  return attachFounderPhotos(deal.id, intel.profile.company, people);
}

export async function assessStoredFounders(deal: Deal): Promise<FounderResearch[]> {
  const intel = deal.intelligence;
  if (!intel) return [];
  const stored = intel.research?.founders ?? [];
  if (!intel.profile.founders.length) return [];
  const names = intel.profile.founders;
  const people: FounderResearch[] = [];
  for (const name of names) {
    const prior = stored.find((item) => item.name === name);
    const hits = prior?.hits?.length
      ? prior.hits
      : await searchFounderHits(name, intel.profile.company, intel.profile.sector);
    const assessed = await assessFounder(name, intel.profile.company, intel.profile.sector, hits);
    people.push(prior?.photoUrl ? { ...assessed, photoUrl: prior.photoUrl } : assessed);
  }
  return attachFounderPhotos(deal.id, intel.profile.company, people);
}

async function searchFounderHits(name: string, company: string, sector: string): Promise<ResearchHit[]> {
  const first = await firecrawlSearch(`${name} LinkedIn founder`, 5);
  const cleaned = preferUseful(first, name, sector, company);
  if (cleaned.length >= 2) return cleaned.slice(0, 4);
  const extra = await firecrawlSearch(`${name} ${sector} founder LinkedIn`, 4);
  return preferUseful([...cleaned, ...extra], name, sector, company).slice(0, 4);
}

function preferUseful(hits: SearchHit[], name: string, sector: string, company: string): ResearchHit[] {
  const first = name.split(" ")[0]?.toLowerCase() ?? "";
  const keys = `${sector} ${company}`
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length > 3);
  const scored = hits
    .filter((hit) => hit.url && !/\/pub\/dir\/|profiles -/i.test(`${hit.title} ${hit.url}`))
    .map((hit) => {
      const blob = `${hit.title} ${hit.description}`.toLowerCase();
      let score = 0;
      if (blob.includes(first)) score += 2;
      if (/linkedin\.com\/in\//i.test(hit.url)) score += 3;
      if (keys.some((key) => blob.includes(key))) score += 2;
      return { hit, score };
    })
    .sort((a, b) => b.score - a.score);
  const seen = new Set<string>();
  return scored
    .map((row) => row.hit)
    .filter((hit) => {
      if (seen.has(hit.url)) return false;
      seen.add(hit.url);
      return true;
    });
}

async function enrichHits(hits: ResearchHit[], limit = 2): Promise<ResearchHit[]> {
  const out: ResearchHit[] = [];
  let scraped = 0;
  for (const hit of hits) {
    if (scraped >= limit || /linkedin\.com/i.test(hit.url)) {
      out.push(hit);
      continue;
    }
    try {
      const page = await firecrawlScrapePage(hit.url);
      scraped += 1;
      out.push({
        ...hit,
        description: (page.markdown || hit.description).replace(/\s+/g, " ").slice(0, 4000),
        images: page.images,
        ogImage: page.ogImage,
      });
    } catch {
      out.push(hit);
    }
  }
  return out;
}

async function assessFounder(
  name: string,
  company: string,
  sector: string,
  hits: ResearchHit[],
): Promise<FounderResearch> {
  if (!hits.length) {
    return {
      name,
      summary: `No public sources landed for ${name}. We did not write a biography from the name alone.`,
      spikes: [],
      hits,
    };
  }
  const sources = hits
    .map((hit, i) => `${i + 1}. ${hit.title}\n${hit.url}\n${hit.description.slice(0, 1800)}`)
    .join("\n\n");
  const parsed = await requireJson<{ summary: string; spikes: FounderSpike[] }>(
    [
      {
        role: "system",
        content:
          "You write short founder diligence for a venture partner. Read the sources first. Use only those sources. Do not invent employers, degrees, or dates. Never say they founded the portfolio company unless a source says so. If the hits look like a namesake, say the record is ambiguous. Spike titles are achievements. Return JSON only.",
      },
      {
        role: "user",
        content: `Deal company: ${company}\nSector: ${sector}\nFounder named on the deal: ${name}\n\nSources:\n${sources}\n\nJSON shape:\n{"summary":"2-3 sentences: who the public record says they are, the spike of excellence, and why it matters for this sector.","spikes":[{"title":"short achievement","detail":"one sentence with the evidence"}]}`,
      },
    ],
    (data) =>
      typeof data.summary === "string" &&
      data.summary.trim().length > 40 &&
      Array.isArray(data.spikes) &&
      data.spikes.length > 0,
    `The model did not produce a founder read for ${name}.`,
  );
  return {
    name,
    summary: parsed.summary.trim(),
    spikes: parsed.spikes
      .map((item) => ({ title: item.title?.trim(), detail: item.detail?.trim() }))
      .filter((item): item is FounderSpike => Boolean(item.title && item.detail))
      .slice(0, 4),
    hits,
  };
}

async function requireJson<T extends object>(
  messages: { role: "system" | "user" | "assistant"; content: string }[],
  ok: (data: T) => boolean,
  fail: string,
): Promise<T> {
  let last = "";
  for (let attempt = 0; attempt < 3; attempt++) {
    last = await chat(messages, { maxTokens: 700, model: settings().diligenceModel });
    const parsed = extractJson<T>(last);
    if (parsed && ok(parsed)) return parsed;
  }
  throw new Error(fail);
}

function extractJson<T>(raw: string): T | null {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(raw.slice(start, end + 1)) as T;
  } catch {
    return null;
  }
}

export async function researchMarket(deal: Deal): Promise<MarketResearch> {
  const intel = deal.intelligence;
  if (!intel) {
    return emptyMarket();
  }
  if (!hasMarketSignal(deal, intel.profile)) {
    return {
      ...emptyMarket(),
      summary: "No sector, product, or TAM in the deck. We did not invent a market.",
    };
  }
  const { sector, product } = intel.profile;
  const tam = await enrichHits(cleanMarketHits(await firecrawlSearch(`${sector} total addressable market size ${product}`, 4)), 1);
  const competitors = await enrichHits(cleanMarketHits(await firecrawlSearch(`${product} competitors ${sector}`, 4)), 1);
  const space = await enrichHits(cleanMarketHits(await firecrawlSearch(`${sector} ${product} market whitespace open competitors`, 3)), 1);
  const deckTam = deal.flags.find((flag) => flag.metric === "tam")?.deckValue
    ?? deal.flags.find((flag) => flag.metric === "tam")?.comment
    ?? intel.claims.find((item) => item.metric === "tam")?.managementValue;
  return assessMarket(intel.profile.company, sector, product, deckTam, tam, competitors, space);
}

export async function assessStoredMarket(deal: Deal): Promise<MarketResearch> {
  const intel = deal.intelligence;
  const prior = intel?.research?.market;
  if (!intel || !prior) return emptyMarket();
  const deckTam = prior.deckTam
    ?? deal.flags.find((flag) => flag.metric === "tam")?.deckValue
    ?? intel.claims.find((item) => item.metric === "tam")?.managementValue;
  return assessMarket(
    intel.profile.company,
    intel.profile.sector,
    intel.profile.product,
    deckTam,
    prior.tam,
    prior.competitors,
    prior.space,
  );
}

function emptyMarket(): MarketResearch {
  return { summary: "", insights: [], tam: [], competitors: [], space: [], at: new Date().toISOString() };
}

function cleanMarketHits(hits: SearchHit[]): ResearchHit[] {
  const seen = new Set<string>();
  return hits.filter((hit) => {
    if (!hit.url || seen.has(hit.url)) return false;
    if (/facebook\.com|\/posts\/|linkedin\.com\/posts/i.test(hit.url)) return false;
    seen.add(hit.url);
    return true;
  });
}

async function assessMarket(
  company: string,
  sector: string,
  product: string,
  deckTam: string | undefined,
  tam: ResearchHit[],
  competitors: ResearchHit[],
  space: ResearchHit[],
): Promise<MarketResearch> {
  const pack = (hits: ResearchHit[]) =>
    hits
      .slice(0, 4)
      .map((hit, i) => `${i + 1}. ${hit.title}\n${hit.url}\n${hit.description.replace(/\s+/g, " ").slice(0, 1800)}`)
      .join("\n\n");
  if (!tam.length && !competitors.length && !space.length) {
    return {
      deckTam,
      summary: "No public market sources landed. We did not invent a TAM.",
      insights: [],
      tam,
      competitors,
      space,
      at: new Date().toISOString(),
    };
  }
  const parsed = await requireJson<{ summary: string; insights: MarketInsight[] }>(
    [
      {
        role: "system",
        content:
          "You write short market diligence for a venture partner. Read the sources first. Use only those sources. Quote sizes with the year and the source name. If the deck number and the public number disagree, say so. Do not invent TAM figures. Return JSON only.",
      },
      {
        role: "user",
        content: `Deal: ${company}\nSector: ${sector}\nProduct: ${product}\nDeck TAM: ${deckTam || "none"}\n\nMarket size sources:\n${pack(tam) || "none"}\n\nOpen space:\n${pack(space) || "none"}\n\nCompetitors:\n${pack(competitors) || "none"}\n\nJSON shape:\n{"summary":"2-3 sentences: the real market, the open space, the fight.","insights":[{"title":"TAM","detail":"one or two sentences"},{"title":"Open space","detail":"one or two sentences"},{"title":"Competitors","detail":"one or two sentences"}]}`,
      },
    ],
    (data) =>
      typeof data.summary === "string" &&
      data.summary.trim().length > 40 &&
      Array.isArray(data.insights) &&
      data.insights.length >= 2,
    `The model did not produce a market read for ${company}.`,
  );
  return {
    deckTam,
    summary: parsed.summary.trim(),
    insights: parsed.insights
      .map((item) => ({ title: item.title?.trim(), detail: item.detail?.trim() }))
      .filter((item): item is MarketInsight => Boolean(item.title && item.detail))
      .slice(0, 4),
    tam,
    competitors,
    space,
    at: new Date().toISOString(),
  };
}
