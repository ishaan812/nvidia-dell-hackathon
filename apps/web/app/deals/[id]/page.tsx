import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { DealLobby } from "@/components/DealLobby";
import { DealShell } from "@/components/deal/DealShell";
import { loadDeal } from "@/lib/diligence/store";
import { toLobbyView } from "@/lib/diligence/view";
import { mergeFlagClaims } from "@/lib/intelligence/fromFlags";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const deal = await loadDeal(id);
  return { title: deal?.intelligence?.profile.company || deal?.company || deal?.name || "Deal" };
}

export default async function DealPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const deal = await loadDeal(id);
  if (!deal) notFound();
  if (!deal.intelligence) {
    return <DealLobby deal={await toLobbyView(deal)} />;
  }
  const merged = mergeFlagClaims(deal);
  return (
    <Suspense fallback={<p className="p-10 text-paper/60">Opening the deal…</p>}>
      <DealShell deal={merged} intel={merged.intelligence!} />
    </Suspense>
  );
}
