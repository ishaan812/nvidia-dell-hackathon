import { NextResponse } from "next/server";
import { firecrawlReady } from "@/lib/diligence/firecrawl";
import { attachFounderPhotos } from "@/lib/diligence/founderPhoto";
import { loadDeal, saveDeal } from "@/lib/diligence/store";

export const maxDuration = 180;

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const deal = await loadDeal(id);
    if (!deal?.intelligence) return NextResponse.json({ error: "Deal not found" }, { status: 404 });
    if (!firecrawlReady()) {
      return NextResponse.json({ error: "Add FIRECRAWL_API_KEY to fetch founder photos." }, { status: 400 });
    }
    const prior = deal.intelligence.research?.founders ?? [];
    if (!prior.length) return NextResponse.json({ people: [] });
    const people = await attachFounderPhotos(deal.id, deal.intelligence.profile.company, prior);
    deal.intelligence.research = { ...deal.intelligence.research, founders: people };
    deal.updatedAt = new Date().toISOString();
    await saveDeal(deal);
    return NextResponse.json({ people });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
