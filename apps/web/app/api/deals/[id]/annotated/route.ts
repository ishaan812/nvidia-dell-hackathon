import { readFile } from "node:fs/promises";
import { NextResponse } from "next/server";
import { ensureAnnotatedDeck } from "@/lib/diligence/annotate";
import { loadDeal } from "@/lib/diligence/store";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const deal = await loadDeal(id);
  if (!deal) return NextResponse.json({ error: "not found" }, { status: 404 });
  try {
    const file = await ensureAnnotatedDeck(deal);
    if (!file) return NextResponse.json({ error: "no annotated deck" }, { status: 404 });
    const bytes = await readFile(file);
    return new NextResponse(Uint8Array.from(bytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${deal.company || "deck"}-annotated.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message || "Could not mark the deck" }, { status: 500 });
  }
}
