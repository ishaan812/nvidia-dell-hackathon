import { NextResponse } from "next/server";
import { pingModel } from "@/lib/diligence/llm";
import { settings } from "@/lib/diligence/paths";

export async function GET() {
  const { llmModel, embeddingModel, llmBaseUrl } = settings();
  return NextResponse.json({
    ok: true,
    using: llmModel,
    embedding: embeddingModel,
    llmBaseUrl,
    model: await pingModel(),
  });
}
