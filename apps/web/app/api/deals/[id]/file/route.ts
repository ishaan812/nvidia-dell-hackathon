import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { resolveDealSource } from "@/lib/diligence/evidence";
import { assertInsideDeal } from "@/lib/diligence/sandbox";
import { loadDeal } from "@/lib/diligence/store";

const TYPES: Record<string, string> = {
  ".pdf": "application/pdf",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".xls": "application/vnd.ms-excel",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ".csv": "text/csv; charset=utf-8",
};

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const name = new URL(request.url).searchParams.get("name");
  if (!name || name.includes("..") || name.includes("/") || name.includes("\\")) {
    return NextResponse.json({ error: "bad file name" }, { status: 400 });
  }
  const deal = await loadDeal(id);
  if (!deal) return NextResponse.json({ error: "not found" }, { status: 404 });
  const file = resolveDealSource(deal, name);
  if (!file) return NextResponse.json({ error: "file not in this room" }, { status: 404 });
  if (deal.sandbox) assertInsideDeal(id, file);
  const bytes = await readFile(file);
  const ext = path.extname(name).toLowerCase();
  return new NextResponse(Uint8Array.from(bytes), {
    headers: {
      "Content-Type": TYPES[ext] ?? "application/octet-stream",
      "Content-Disposition": `inline; filename="${name}"`,
      "Cache-Control": "no-store",
    },
  });
}
