import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { resolveFounderPhotoFile } from "@/lib/diligence/founderPhoto";
import { loadDeal } from "@/lib/diligence/store";

const TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
};

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const who = new URL(request.url).searchParams.get("who") ?? "";
  const deal = await loadDeal(id);
  if (!deal) return NextResponse.json({ error: "not found" }, { status: 404 });
  const file = await resolveFounderPhotoFile(id, who);
  if (!file) return NextResponse.json({ error: "no photo" }, { status: 404 });
  const bytes = await readFile(file);
  const ext = path.extname(file).toLowerCase();
  return new NextResponse(Uint8Array.from(bytes), {
    headers: {
      "Content-Type": TYPES[ext] ?? "image/jpeg",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
