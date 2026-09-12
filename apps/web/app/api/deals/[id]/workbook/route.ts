import { NextResponse } from "next/server";
import { resolveDealSource } from "@/lib/diligence/evidence";
import { assertInsideDeal } from "@/lib/diligence/sandbox";
import { loadDeal } from "@/lib/diligence/store";
import { readWorkbookGrid } from "@/lib/diligence/workbook";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const name = new URL(request.url).searchParams.get("name");
    if (!name || name.includes("..") || name.includes("/") || name.includes("\\")) {
      return NextResponse.json({ error: "bad file name" }, { status: 400 });
    }
    if (!/\.(xlsx?|csv)$/i.test(name)) {
      return NextResponse.json({ error: "not a workbook" }, { status: 400 });
    }
    const deal = await loadDeal(id);
    if (!deal) return NextResponse.json({ error: "not found" }, { status: 404 });
    const file = resolveDealSource(deal, name);
    if (!file) return NextResponse.json({ error: "file not in this room" }, { status: 404 });
    if (deal.sandbox) assertInsideDeal(id, file);
    const grid = await readWorkbookGrid(file, name);
    return NextResponse.json(grid, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message || "Could not open that workbook" },
      { status: 500 },
    );
  }
}
