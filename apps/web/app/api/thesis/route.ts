import { NextResponse } from "next/server";
import { loadThesis, saveThesis } from "@/lib/intelligence/thesis";
import type { ThesisSettings } from "@/lib/intelligence/types";

export async function GET() {
  return NextResponse.json(await loadThesis());
}

export async function PUT(request: Request) {
  const body = (await request.json()) as ThesisSettings;
  if (!body || !Array.isArray(body.preferredSectors)) {
    return NextResponse.json({ error: "Invalid thesis" }, { status: 400 });
  }
  const saved = await saveThesis(body);
  return NextResponse.json(saved);
}
