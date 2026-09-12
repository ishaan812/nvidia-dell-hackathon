import { NextResponse } from "next/server";
import { seedIntelligence } from "@/lib/intelligence/seed";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { force?: boolean };
  const result = await seedIntelligence({ force: Boolean(body.force) });
  return NextResponse.json(result);
}
