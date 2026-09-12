import { NextResponse } from "next/server";
import { recomputeDesk } from "@/lib/diligence/recompute";
import { loadDeal } from "@/lib/diligence/store";

export const maxDuration = 300;

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const deal = await loadDeal(id);
    if (!deal) return NextResponse.json({ error: "Deal not found" }, { status: 404 });
    const result = await recomputeDesk(deal);
    return NextResponse.json({
      id: result.deal.id,
      steps: result.steps,
      flags: result.deal.flags.length,
      founders: result.deal.intelligence?.research?.founders?.length ?? 0,
      market: Boolean(result.deal.intelligence?.research?.market?.summary),
    });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message || "Could not recompute this deal" },
      { status: 500 },
    );
  }
}
