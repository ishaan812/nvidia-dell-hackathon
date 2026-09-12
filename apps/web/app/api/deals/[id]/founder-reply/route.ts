import { NextResponse } from "next/server";
import { decideDemo } from "@/lib/intelligence/demo";
import { applyFounderReply } from "@/lib/intelligence/store";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (id === "northstar-live") {
    try {
      const snap = await decideDemo(id, "founder", "apply reply");
      return NextResponse.json(snap);
    } catch {
      // Seeded-style apply still works if the live gate is not founder yet.
    }
  }
  const deal = await applyFounderReply(id);
  if (!deal) return NextResponse.json({ error: "Deal not found" }, { status: 404 });
  return NextResponse.json({
    id: deal.id,
    conviction: deal.intelligence?.scores.investmentConviction,
    nextAction: deal.intelligence?.nextAction.title,
    applied: deal.intelligence?.founderReplyApplied,
  });
}
