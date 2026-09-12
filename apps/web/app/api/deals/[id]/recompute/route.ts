import { NextResponse } from "next/server";
import { recomputeDeal } from "@/lib/diligence/recompute";
import { loadDeal } from "@/lib/diligence/store";

export const maxDuration = 300;

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const deal = await loadDeal(id);
    if (!deal) return NextResponse.json({ error: "Deal not found" }, { status: 404 });
    const next = await recomputeDeal(deal);
    return NextResponse.json({
      id: next.id,
      status: next.status,
      riskScore: next.riskScore,
      flags: next.flags.length,
      files: next.docs.map((doc) => doc.filename),
    });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message || "Could not recompute this deal" },
      { status: 500 },
    );
  }
}
