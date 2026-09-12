import { NextResponse } from "next/server";
import { loadDeal, summarize } from "@/lib/diligence/store";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const deal = await loadDeal(id);
  if (!deal) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ deal, summary: summarize(deal) });
}
