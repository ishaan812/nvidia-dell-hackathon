import { notFound } from "next/navigation";
import { DealRoom } from "@/components/DealRoom";
import { loadDeal } from "@/lib/diligence/store";
import { toRoomView } from "@/lib/diligence/view";

export const dynamic = "force-dynamic";

export default async function DeckPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ name?: string }>;
}) {
  const { id } = await params;
  const { name } = await searchParams;
  const deal = await loadDeal(id);
  if (!deal) notFound();
  return <DealRoom deal={toRoomView(deal, name)} />;
}
