import { NextResponse } from "next/server";
import { applyFounderReply } from "@/lib/intelligence/store";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const deal = await applyFounderReply(id);
  if (!deal) return NextResponse.json({ error: "Deal not found" }, { status: 404 });
  return NextResponse.json({
    id: deal.id,
    conviction: deal.intelligence?.scores.investmentConviction,
    nextAction: deal.intelligence?.nextAction.title,
    applied: deal.intelligence?.founderReplyApplied,
  });
}
