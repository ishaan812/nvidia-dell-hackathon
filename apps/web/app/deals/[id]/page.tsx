import { notFound } from "next/navigation";
import { DealLobby } from "@/components/DealLobby";
import { loadDeal } from "@/lib/diligence/store";
import { toLobbyView } from "@/lib/diligence/view";

export const dynamic = "force-dynamic";

export default async function DealPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const deal = await loadDeal(id);
  if (!deal) notFound();
  return <DealLobby deal={await toLobbyView(deal)} />;
}
