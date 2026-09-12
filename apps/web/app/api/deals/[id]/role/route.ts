import { NextResponse } from "next/server";
import { setFileRole } from "@/lib/diligence/pipeline";
import { loadDeal } from "@/lib/diligence/store";
import type { FileRole } from "@/lib/diligence/types";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const deal = await loadDeal(id);
    if (!deal) return NextResponse.json({ error: "Deal not found" }, { status: 404 });
    const body = (await request.json()) as { filename?: string; role?: FileRole };
    if (!body.filename || (body.role !== "deck" && body.role !== "room")) {
      return NextResponse.json({ error: "Choose a file and whether it is a deck or data room" }, { status: 400 });
    }
    const next = await setFileRole(deal, body.filename, body.role);
    return NextResponse.json({
      id: next.id,
      filename: body.filename,
      role: body.role,
      decks: next.deckFilenames ?? [],
    });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message || "Could not move that file" },
      { status: 500 },
    );
  }
}
