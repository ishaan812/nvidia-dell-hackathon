import { NextResponse } from "next/server";
import { loadDeal } from "@/lib/diligence/store";
import { answerQuery } from "@/lib/diligence/rag";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const deal = await loadDeal(id);
    if (!deal) return NextResponse.json({ error: "not found" }, { status: 404 });
    const body = (await request.json()) as { question?: string };
    if (!body.question) return NextResponse.json({ error: "question required" }, { status: 400 });
    const result = await answerQuery(deal, body.question);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message || "Could not ask the room" },
      { status: 500 },
    );
  }
}
