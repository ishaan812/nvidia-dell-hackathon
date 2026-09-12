import { PipelineHome } from "@/components/pipeline/PipelineHome";
import { pingModel } from "@/lib/diligence/llm";
import { settings } from "@/lib/diligence/paths";
import { listDeals } from "@/lib/diligence/store";
import { ensureSeeded } from "@/lib/intelligence/seed";

export const dynamic = "force-dynamic";

export default async function Home() {
  await ensureSeeded();
  const [deals, model] = await Promise.all([listDeals(), pingModel()]);
  return <PipelineHome deals={deals} model={model} using={settings().llmModel} />;
}
