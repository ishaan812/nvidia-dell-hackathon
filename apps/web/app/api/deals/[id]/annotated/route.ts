import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { resolveExisting } from "@/lib/diligence/files";
import { dirs } from "@/lib/diligence/paths";
import { loadDeal } from "@/lib/diligence/store";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const deal = await loadDeal(id);
  if (!deal) return NextResponse.json({ error: "not found" }, { status: 404 });
  const file =
    resolveExisting(path.join(dirs().outbox, id, "deck.annotated.pdf")) ??
    resolveExisting(path.join(dirs().data, id, "deck.annotated.pdf"));
  if (!file) return NextResponse.json({ error: "no annotated deck" }, { status: 404 });
  const bytes = await readFile(file);
  return new NextResponse(Uint8Array.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${deal.company || "deck"}-annotated.pdf"`,
    },
  });
}
