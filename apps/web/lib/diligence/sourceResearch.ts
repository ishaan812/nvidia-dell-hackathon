import { fillProfileFromDeck, hasMarketSignal, hasNamedFounders } from "../intelligence/fromDeck";
import type { Deal } from "./types";
import { firecrawlReady } from "./firecrawl";
import { researchFounders, researchMarket } from "./research";
import { saveDeal } from "./store";

function stamp(deal: Deal, title: string, body: string) {
  const intel = deal.intelligence;
  if (!intel) return;
  intel.timeline.push({
    id: `tl-${deal.id}-src-${Date.now()}`,
    at: new Date().toISOString(),
    title,
    body,
    source: "Source diligence",
  });
}

export async function ensureSourceResearch(deal: Deal): Promise<Deal> {
  if (!deal.intelligence) return deal;
  if (deal.intelligence.research?.founders?.length || deal.intelligence.research?.market?.summary) {
    return deal;
  }

  deal.intelligence.profile = await fillProfileFromDeck(deal, deal.intelligence.profile);
  const profile = deal.intelligence.profile;
  const foundersOk = hasNamedFounders(profile);
  const marketOk = hasMarketSignal(deal, profile);

  deal.intelligence.research = { ...deal.intelligence.research };
  await saveDeal(deal);

  if (!foundersOk && !marketOk) {
    stamp(deal, "Source diligence", "Deck named no founders and no market hook. We did not search the open web.");
    await saveDeal(deal);
    return deal;
  }

  if (!firecrawlReady()) {
    stamp(deal, "Source diligence", "Deck facts are on the profile. Public founder and market reads need FIRECRAWL_API_KEY.");
    await saveDeal(deal);
    return deal;
  }

  if (foundersOk) {
    try {
      const founders = await researchFounders(deal);
      deal.intelligence.research = { ...deal.intelligence.research, founders };
      stamp(
        deal,
        "Founder reads",
        `Public history on ${founders.map((person) => person.name).join(", ") || "named founders"}.`,
      );
      await saveDeal(deal);
    } catch (error) {
      stamp(deal, "Founder reads", `Skipped: ${(error as Error).message}`);
      await saveDeal(deal);
    }
  } else {
    stamp(deal, "Founder reads", "No founders named on the deck. We did not search the company name.");
    await saveDeal(deal);
  }

  if (marketOk) {
    try {
      const market = await researchMarket(deal);
      deal.intelligence.research = { ...deal.intelligence.research, market };
      stamp(deal, "Market read", market.summary || "Public market sources landed.");
      await saveDeal(deal);
    } catch (error) {
      stamp(deal, "Market read", `Skipped: ${(error as Error).message}`);
      await saveDeal(deal);
    }
  } else {
    stamp(deal, "Market read", "No sector, product, or TAM on the deck. We did not invent a market.");
    await saveDeal(deal);
  }

  return deal;
}
