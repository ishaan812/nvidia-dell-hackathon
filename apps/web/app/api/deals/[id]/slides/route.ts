import { readFile } from "node:fs/promises";
import { NextResponse } from "next/server";
import { resolveDealSource } from "@/lib/diligence/evidence";
import { parsePptx } from "@/lib/diligence/pptx";
import { assertInsideDeal } from "@/lib/diligence/sandbox";
import { loadDeal } from "@/lib/diligence/store";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const name = new URL(request.url).searchParams.get("name");
  if (!name || name.includes("..") || name.includes("/") || name.includes("\\")) {
    return NextResponse.json({ error: "bad file name" }, { status: 400 });
  }
  if (!/\.pptx$/i.test(name)) {
    return NextResponse.json({ error: "not a PowerPoint file" }, { status: 400 });
  }
  const deal = await loadDeal(id);
  if (!deal) return NextResponse.json({ error: "not found" }, { status: 404 });
  const file = resolveDealSource(deal, name);
  if (!file) return NextResponse.json({ error: "file not in this room" }, { status: 404 });
  if (deal.sandbox) assertInsideDeal(id, file);
  const slides = await parsePptx(await readFile(file));
  return NextResponse.json({ filename: name, slides });
}
