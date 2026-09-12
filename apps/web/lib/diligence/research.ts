import type { Deal } from "./types";
import { firecrawlSearch, type SearchHit } from "./firecrawl";
import { chat } from "./llm";
import type { FounderResearch, FounderSpike, MarketInsight, MarketResearch, ResearchHit } from "../intelligence/types";

export async function researchFounders(deal: Deal): Promise<FounderResearch[]> {
  const intel = deal.intelligence;
  if (!intel) return [];
  const names = intel.profile.founders.length ? intel.profile.founders : [intel.profile.company];
  const people: FounderResearch[] = [];
  for (const name of names) {
    const hits = await searchFounderHits(name, intel.profile.company, intel.profile.sector);
    people.push(await assessFounder(name, intel.profile.company, intel.profile.sector, hits));
  }
  return people;
}

export async function assessStoredFounders(deal: Deal): Promise<FounderResearch[]> {
  const intel = deal.intelligence;
  if (!intel) return [];
  const stored = intel.research?.founders ?? [];
  const names = intel.profile.founders.length ? intel.profile.founders : [intel.profile.company];
  const people: FounderResearch[] = [];
  for (const name of names) {
    const prior = stored.find((item) => item.name === name);
    const hits = prior?.hits?.length
      ? prior.hits
      : await searchFounderHits(name, intel.profile.company, intel.profile.sector);
    people.push(await assessFounder(name, intel.profile.company, intel.profile.sector, hits));
  }
  return people;
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

async function assessFounder(
  name: string,
  company: string,
  sector: string,
  hits: ResearchHit[],
): Promise<FounderResearch> {
  const sources = hits
    .map(
      (hit, i) =>
        `${i + 1}. ${hit.title}\n${hit.url}\n${hit.description.slice(0, 500)}`,
    )
    .join("\n\n");
  const raw = sources
    ? await chat(
        [
          {
            role: "system",
            content:
              "You write short founder diligence for a venture partner. Use only the sources. Do not invent employers, degrees, or dates. Never say they founded the portfolio company unless a source says so. If the public hits look like a namesake, say the record is ambiguous. Spike titles are achievements, not 'LinkedIn profile'. Return JSON only.",
          },
          {
            role: "user",
            content: `Deal company: ${company}\nSector: ${sector}\nFounder named on the deal: ${name}\n\nSources:\n${sources}\n\nJSON shape:\n{"summary":"2-3 sentences: who the public record says they are, the spike of excellence, and why it matters for this sector.","spikes":[{"title":"short achievement","detail":"one sentence with the evidence"}]}`,
          },
        ],
        { maxTokens: 500 },
      )
    : "";
  const parsed = readAssessment(raw);
  return {
    name,
    summary: parsed?.summary || fallbackSummary(name, company, hits),
    spikes: parsed?.spikes?.length ? parsed.spikes.slice(0, 4) : fallbackSpikes(hits),
    hits,
  };
}

function readAssessment(raw: string): { summary?: string; spikes?: FounderSpike[] } | null {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    const data = JSON.parse(raw.slice(start, end + 1)) as {
      summary?: unknown;
      spikes?: unknown;
    };
    const spikes = Array.isArray(data.spikes)
      ? data.spikes
          .map((item) => {
            if (!item || typeof item !== "object") return null;
            const row = item as Record<string, unknown>;
            if (typeof row.title !== "string" || typeof row.detail !== "string") return null;
            return { title: row.title.trim(), detail: row.detail.trim() };
          })
          .filter((item): item is FounderSpike => Boolean(item?.title && item.detail))
      : [];
    return {
      summary: typeof data.summary === "string" ? data.summary.trim() : undefined,
      spikes,
    };
  } catch {
    return null;
  }
}

function fallbackSummary(name: string, company: string, hits: ResearchHit[]): string {
  const lead = hits[0];
  if (!lead) return `${name} is named on ${company}. No public history is attached yet.`;
  const clip = lead.description.replace(/\s+/g, " ").slice(0, 280);
  return clip ? `${name}. ${clip}` : `${name} appears in public records as ${lead.title}.`;
}

function fallbackSpikes(hits: ResearchHit[]): FounderSpike[] {
  return hits.slice(0, 2).map((hit) => ({
    title: hit.title.split(/[-|–]/)[0]?.trim() || "Public record",
    detail: (hit.description || hit.title).replace(/\s+/g, " ").slice(0, 180),
  }));
}

export async function researchMarket(deal: Deal): Promise<MarketResearch> {
  const intel = deal.intelligence;
  if (!intel) {
    return emptyMarket();
  }
  const { sector, product } = intel.profile;
  const tam = cleanMarketHits(await firecrawlSearch(`${sector} total addressable market size ${product}`, 4));
  const competitors = cleanMarketHits(await firecrawlSearch(`${product} competitors ${sector}`, 4));
  const space = cleanMarketHits(await firecrawlSearch(`${sector} ${product} market whitespace open competitors`, 3));
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
      .map((hit, i) => `${i + 1}. ${hit.title}\n${hit.url}\n${hit.description.replace(/\s+/g, " ").slice(0, 360)}`)
      .join("\n\n");
  const raw = await chat(
    [
      {
        role: "system",
        content:
          "You write short market diligence for a venture partner. Use only the sources. Quote sizes with the year and the source. If the deck number and the public number disagree, say so. Do not invent TAM figures. Return JSON only.",
      },
      {
        role: "user",
        content: `Deal: ${company}\nSector: ${sector}\nProduct: ${product}\nDeck TAM: ${deckTam || "none"}\n\nMarket size sources:\n${pack(tam) || "none"}\n\nOpen space:\n${pack(space) || "none"}\n\nCompetitors:\n${pack(competitors) || "none"}\n\nJSON shape:\n{"summary":"2-3 sentences: the real market, the open space, the fight.","insights":[{"title":"TAM","detail":"one or two sentences"},{"title":"Open space","detail":"one or two sentences"},{"title":"Competitors","detail":"one or two sentences"}]}`,
      },
    ],
    { maxTokens: 600 },
  );
  const parsed = readMarket(raw);
  return {
    deckTam,
    summary: parsed?.summary || fallbackMarketSummary(company, deckTam, tam),
    insights: parsed?.insights?.length ? parsed.insights.slice(0, 4) : fallbackMarketInsights(deckTam, tam, space, competitors),
    tam,
    competitors,
    space,
    at: new Date().toISOString(),
  };
}

function readMarket(raw: string): { summary?: string; insights?: MarketInsight[] } | null {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    const data = JSON.parse(raw.slice(start, end + 1)) as { summary?: unknown; insights?: unknown };
    const insights = Array.isArray(data.insights)
      ? data.insights
          .map((item) => {
            if (!item || typeof item !== "object") return null;
            const row = item as Record<string, unknown>;
            if (typeof row.title !== "string" || typeof row.detail !== "string") return null;
            return { title: row.title.trim(), detail: row.detail.trim() };
          })
          .filter((item): item is MarketInsight => Boolean(item?.title && item.detail))
      : [];
    return {
      summary: typeof data.summary === "string" ? data.summary.trim() : undefined,
      insights,
    };
  } catch {
    return null;
  }
}

function fallbackMarketSummary(company: string, deckTam: string | undefined, tam: ResearchHit[]): string {
  if (deckTam && tam[0]) return `${company} states ${deckTam}. Public sources start at ${tam[0].title}.`;
  if (tam[0]) return `Public market write-ups exist. Lead source: ${tam[0].title}.`;
  return "No usable market-size source yet.";
}

function fallbackMarketInsights(
  deckTam: string | undefined,
  tam: ResearchHit[],
  space: ResearchHit[],
  competitors: ResearchHit[],
): MarketInsight[] {
  return [
    { title: "TAM", detail: deckTam ? `Deck: ${deckTam}. ${clipHit(tam[0])}` : clipHit(tam[0]) || "No size in the public hits." },
    { title: "Open space", detail: clipHit(space[0]) || "No whitespace source yet." },
    { title: "Competitors", detail: clipHit(competitors[0]) || "No competitor source yet." },
  ];
}

function clipHit(hit?: ResearchHit): string {
  if (!hit) return "";
  return hit.description.replace(/\s+/g, " ").replace(/^#+\s*/g, "").slice(0, 220);
}
