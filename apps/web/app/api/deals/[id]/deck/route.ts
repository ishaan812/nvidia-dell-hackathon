import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { resolveExisting } from "@/lib/diligence/files";
import { dirs } from "@/lib/diligence/paths";
import { deckDocs } from "@/lib/diligence/roles";
import { assertInsideDeal } from "@/lib/diligence/sandbox";
import { loadDeal } from "@/lib/diligence/store";
import { resolveDealSource } from "@/lib/diligence/evidence";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const deal = await loadDeal(id);
  if (!deal) return NextResponse.json({ error: "Deal not found" }, { status: 404 });
  const name = new URL(request.url).searchParams.get("name") ?? undefined;
  const decks = deckDocs(deal.docs);
  const chosen =
    decks.find((doc) => doc.filename === name) ??
    decks.find((doc) => doc.filename === deal.deckFilename) ??
    decks[0];
  const stored = path.join(dirs().data, id, "deck.pdf");
  const fromRoom = chosen ? resolveDealSource(deal, chosen.filename) : null;
  const fallback = chosen ? resolveExisting(chosen.path, chosen.filename) : null;
  const file =
    (name && fromRoom) ||
    fromRoom ||
    (existsSync(stored) && !name ? stored : null) ||
    fallback;
  if (!file) return NextResponse.json({ error: "no deck" }, { status: 404 });
  if (deal.sandbox) assertInsideDeal(id, file);
  const bytes = await readFile(file);
  return new NextResponse(Uint8Array.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${chosen?.filename ?? "deck.pdf"}"`,
      "Cache-Control": "no-store",
    },
  });
}
