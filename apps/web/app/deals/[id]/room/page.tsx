import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DealLobby } from "@/components/DealLobby";
import { loadDeal } from "@/lib/diligence/store";
import { toLobbyView } from "@/lib/diligence/view";
import { settings } from "@/lib/diligence/paths";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const deal = await loadDeal(id);
  const name = deal?.intelligence?.profile.company || deal?.company || deal?.name || "Deal";
  return { title: `${name} room` };
}

export default async function DealRoomPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const deal = await loadDeal(id);
  if (!deal) notFound();
  return <DealLobby deal={await toLobbyView(deal)} model={settings().llmModel} />;
}
