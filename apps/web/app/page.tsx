import { DealPicker } from "@/components/DealPicker";
import { pingModel } from "@/lib/diligence/llm";
import { listDeals } from "@/lib/diligence/store";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [deals, model] = await Promise.all([listDeals(), pingModel()]);
  return <DealPicker deals={deals} model={model} />;
}
