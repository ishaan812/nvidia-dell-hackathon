import { NextResponse } from "next/server";
import { listDeals } from "@/lib/diligence/store";
import { runDeal } from "@/lib/diligence/pipeline";
import { pingModel } from "@/lib/diligence/llm";

export async function GET() {
  const deals = await listDeals();
  const model = await pingModel();
  return NextResponse.json({ deals, model });
}

export async function POST(request: Request) {
  const body = (await request.json()) as { path?: string; name?: string };
  if (!body.path) return NextResponse.json({ error: "path required" }, { status: 400 });
  const deal = await runDeal(body.path, body.name);
  return NextResponse.json({ id: deal.id, status: deal.status, riskScore: deal.riskScore });
}
