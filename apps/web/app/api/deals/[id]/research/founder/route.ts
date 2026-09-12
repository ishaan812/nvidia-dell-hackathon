import { NextResponse } from "next/server";
import { firecrawlReady } from "@/lib/diligence/firecrawl";
import { researchFounders } from "@/lib/diligence/research";
import { loadDeal, saveDeal } from "@/lib/diligence/store";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const deal = await loadDeal(id);
    if (!deal?.intelligence) return NextResponse.json({ error: "Deal not found" }, { status: 404 });
    if (!firecrawlReady()) {
      return NextResponse.json({ error: "Add FIRECRAWL_API_KEY to run founder search." }, { status: 400 });
    }
    const people = await researchFounders(deal);
    deal.intelligence.research = { ...deal.intelligence.research, founders: people };
    deal.updatedAt = new Date().toISOString();
    await saveDeal(deal);
    return NextResponse.json({ people, at: new Date().toISOString() });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
