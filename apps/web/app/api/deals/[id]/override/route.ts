import { NextResponse } from "next/server";
import { applyScoreOverride } from "@/lib/intelligence/store";
import type { ScoreKey } from "@/lib/intelligence/types";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = (await request.json()) as { key?: ScoreKey; value?: number; reason?: string };
  if (!body.key || typeof body.value !== "number" || !body.reason?.trim()) {
    return NextResponse.json({ error: "key, value, and reason are required" }, { status: 400 });
  }
  const deal = await applyScoreOverride(id, body.key, body.value, body.reason.trim());
  if (!deal) return NextResponse.json({ error: "Deal not found" }, { status: 404 });
  return NextResponse.json({ id: deal.id, scores: deal.intelligence?.scores });
}
