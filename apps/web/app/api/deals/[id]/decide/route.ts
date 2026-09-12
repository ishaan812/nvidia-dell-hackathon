import { NextResponse } from "next/server";
import { decideDemo } from "@/lib/intelligence/demo";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as { gate?: string; choice?: string };
  if (!body.gate || !body.choice) {
    return NextResponse.json({ error: "Choose a gate and a verb" }, { status: 400 });
  }
  try {
    const snap = await decideDemo(id, body.gate, body.choice);
    return NextResponse.json(snap);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
