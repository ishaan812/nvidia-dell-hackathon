import { NextResponse } from "next/server";
import { loadDeal } from "@/lib/diligence/store";
import { answerQuery } from "@/lib/diligence/rag";
import type { AskTurn } from "@/lib/diligence/types";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const deal = await loadDeal(id);
    if (!deal) return NextResponse.json({ error: "not found" }, { status: 404 });
    const body = (await request.json()) as { question?: string; history?: AskTurn[] };
    if (!body.question) return NextResponse.json({ error: "question required" }, { status: 400 });
    const history = (body.history ?? []).filter(
      (turn) => (turn.role === "user" || turn.role === "assistant") && typeof turn.content === "string",
    );
    const result = await answerQuery(deal, body.question, history);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message || "Could not ask the room" },
      { status: 500 },
    );
  }
}
