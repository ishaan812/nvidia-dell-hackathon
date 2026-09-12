import { NextResponse } from "next/server";
import { pingModel } from "@/lib/diligence/llm";

export async function GET() {
  return NextResponse.json({ ok: true, model: await pingModel() });
}
