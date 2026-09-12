import { NextResponse } from "next/server";
import { decideDemo } from "@/lib/intelligence/demo";

async function readChoice(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    const body = (await request.json().catch(() => ({}))) as { gate?: string; choice?: string };
    return { gate: body.gate ?? "", choice: body.choice ?? "", json: true };
  }
  const form = await request.formData().catch(() => null);
  return {
    gate: String(form?.get("gate") ?? ""),
    choice: String(form?.get("choice") ?? ""),
    json: false,
  };
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { gate, choice, json } = await readChoice(request);
  if (!gate || !choice) {
    if (!json) return NextResponse.redirect(new URL(`/deals/${id}`, request.url), 303);
    return NextResponse.json({ error: "Choose a gate and a verb" }, { status: 400 });
  }
  try {
    const snap = await decideDemo(id, gate, choice);
    if (!json) return NextResponse.redirect(new URL(`/deals/${id}`, request.url), 303);
    return NextResponse.json(snap);
  } catch (error) {
    if (!json) return NextResponse.redirect(new URL(`/deals/${id}`, request.url), 303);
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
