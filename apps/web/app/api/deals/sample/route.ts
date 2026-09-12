import { NextResponse } from "next/server";
import { runDeal } from "@/lib/diligence/pipeline";
import { buildNorthstar } from "@/lib/diligence/sample";

export async function POST() {
  try {
    const folder = await buildNorthstar();
    const deal = await runDeal(folder, "Northstar Robotics");
    return NextResponse.json({
      id: deal.id,
      status: deal.status,
      riskScore: deal.riskScore,
      flags: deal.flags.length,
    });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message || "Could not open the sample room" },
      { status: 500 },
    );
  }
}
