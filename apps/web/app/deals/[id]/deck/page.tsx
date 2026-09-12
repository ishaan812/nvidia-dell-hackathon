import type { Metadata } from "next";
import { readFile } from "node:fs/promises";
import { notFound } from "next/navigation";
import { DealRoom } from "@/components/DealRoom";
import { ensureAnnotatedDeck } from "@/lib/diligence/annotate";
import { resolveDealSource } from "@/lib/diligence/evidence";
import { settings } from "@/lib/diligence/paths";
import { parsePptx } from "@/lib/diligence/pptx";
import { loadDeal } from "@/lib/diligence/store";
import { toRoomView } from "@/lib/diligence/view";
import { readWorkbookGrid } from "@/lib/diligence/workbook";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const deal = await loadDeal(id);
  const name = deal?.intelligence?.profile.company || deal?.company || deal?.name || "Deal";
  return { title: `${name} deck` };
}

export default async function DeckPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ name?: string; flag?: string }>;
}) {
  const { id } = await params;
  const { name, flag } = await searchParams;
  const deal = await loadDeal(id);
  if (!deal) notFound();
  const view = toRoomView(deal, name);
  const deckName = view.activeDeck ?? "";
  const flagId = flag ?? view.flags[0]?.id ?? null;
  const active = view.flags.find((item) => item.id === flagId) ?? view.flags[0] ?? null;

  let slides;
  if (/\.pptx$/i.test(deckName)) {
    const file = resolveDealSource(deal, deckName);
    if (file) slides = await parsePptx(await readFile(file));
  } else {
    await ensureAnnotatedDeck(deal).catch(() => null);
  }

  let workbook = null;
  if (active?.sourceFile && /\.(xlsx?|csv)$/i.test(active.sourceFile)) {
    const file = resolveDealSource(deal, active.sourceFile);
    if (file) workbook = await readWorkbookGrid(file, active.sourceFile).catch(() => null);
  }

  return (
    <DealRoom deal={view} model={settings().llmModel} flagId={flagId} slides={slides} workbook={workbook} />
  );
}
