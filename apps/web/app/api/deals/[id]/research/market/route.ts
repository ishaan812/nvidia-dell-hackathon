import { NextResponse } from "next/server";
import { firecrawlReady } from "@/lib/diligence/firecrawl";
import { researchMarket } from "@/lib/diligence/research";
import { loadDeal, saveDeal } from "@/lib/diligence/store";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const deal = await loadDeal(id);
    if (!deal?.intelligence) return NextResponse.json({ error: "Deal not found" }, { status: 404 });
    if (!firecrawlReady()) {
      return NextResponse.json({ error: "Add FIRECRAWL_API_KEY to run market search." }, { status: 400 });
    }
    const market = await researchMarket(deal);
    deal.intelligence.research = { ...deal.intelligence.research, market };
    deal.updatedAt = new Date().toISOString();
    await saveDeal(deal);
    return NextResponse.json({
      company: deal.intelligence.profile.company,
      sector: deal.intelligence.profile.sector,
      ...market,
    });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
