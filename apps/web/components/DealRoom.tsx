"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { DealRoomView } from "@/lib/diligence/types";
import { riskTone } from "@/lib/format";
import { BrandLogo } from "./BrandLogo";
import { ModelBadge } from "./ModelBadge";
import { FlagList } from "./FlagList";
import { SideDesk, type SidePane } from "./SideDesk";

const DeckViewer = dynamic(() => import("./DeckViewer").then((mod) => mod.DeckViewer), {
  ssr: false,
  loading: () => <p className="p-8 font-mono text-[12px] text-black/45">Opening slides…</p>,
});

const PptxViewer = dynamic(() => import("./PptxViewer").then((mod) => mod.PptxViewer), {
  ssr: false,
  loading: () => <p className="p-8 font-mono text-[12px] text-black/45">Opening slides…</p>,
});

type Props = {
  deal: DealRoomView;
  model?: string;
};

export function DealRoom({ deal, model }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [pane, setPane] = useState<SidePane>("source");
  const [activeId, setActiveId] = useState<string | null>(deal.flags[0]?.id ?? null);
  const checks = deal.flags.filter((flag) => flag.severity !== "missing").length;
  const active = deal.flags.find((flag) => flag.id === activeId) ?? null;

  function openFlag(id: string) {
    setActiveId(id);
    setPane("source");
  }

  function recompute() {
    startTransition(async () => {
      const res = await fetch(`/api/deals/${deal.id}/recompute`, { method: "POST" });
      if (res.ok) router.refresh();
    });
  }

  return (
    <div className="flex h-screen flex-col bg-desk text-paper">
      <header className="flex items-center justify-between gap-6 border-b border-white/10 px-6 py-3">
        <div className="flex min-w-0 items-center gap-4">
          <BrandLogo compact size={18} />
          <Link
            href={`/deals/${deal.id}`}
            className="shrink-0 text-[14px] text-paper/80 underline-offset-2 hover:text-paper hover:underline"
          >
            Back to data room
          </Link>
          <h1 className="truncate font-serif text-[28px] leading-none">{deal.company || deal.name}</h1>
        </div>
        <div className="flex items-baseline gap-5 font-mono text-[11px] text-paper/45">
          <ModelBadge name={model} />
          <span className={riskTone(deal.riskScore)}>
            {deal.riskScore != null ? `risk ${deal.riskScore}` : deal.status}
          </span>
          <span>
            {checks} {checks === 1 ? "thing" : "things"} to check
          </span>
          {deal.decks.length > 1 ? (
            <label className="flex items-center gap-2 text-paper/70">
              Deck
              <select
                value={deal.activeDeck ?? deal.decks[0]?.filename}
                onChange={(event) => {
                  router.push(`/deals/${deal.id}/deck?name=${encodeURIComponent(event.target.value)}`);
                }}
                className="border border-white/20 bg-transparent px-2 py-1 text-paper"
              >
                {deal.decks.map((item) => (
                  <option key={item.filename} value={item.filename} className="text-ink">
                    {item.filename}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <a
            href={`/api/deals/${deal.id}/deck${deal.activeDeck ? `?name=${encodeURIComponent(deal.activeDeck)}` : ""}`}
            className="hover:text-paper"
          >
            original
          </a>
          <a href={`/api/deals/${deal.id}/annotated`} className="hover:text-paper">
            marked pdf
          </a>
          <button
            type="button"
            disabled={pending}
            onClick={recompute}
            className="text-paper/80 hover:text-paper disabled:opacity-50"
          >
            {pending ? "Recomputing…" : "Recompute"}
          </button>
        </div>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-[260px_minmax(0,1fr)_400px]">
        <FlagList flags={deal.flags} activeId={activeId} onSelect={openFlag} />
        <main className="min-h-0 min-w-0 overflow-y-auto bg-[#d8dee4]">
          {/\.pptx$/i.test(deal.activeDeck ?? deal.decks[0]?.filename ?? "") ? (
            <PptxViewer
              src={`/api/deals/${deal.id}/slides?name=${encodeURIComponent(deal.activeDeck ?? deal.decks[0]?.filename ?? "")}`}
              flags={deal.flags}
              activeId={activeId}
              onSelect={openFlag}
            />
          ) : (
            <DeckViewer
              src={`/api/deals/${deal.id}/deck${deal.activeDeck ? `?name=${encodeURIComponent(deal.activeDeck)}` : ""}`}
              flags={deal.flags}
              activeId={activeId}
              onSelect={openFlag}
            />
          )}
        </main>
        <SideDesk deal={deal} flag={active} pane={pane} onPane={setPane} onOpenFlag={openFlag} />
      </div>
    </div>
  );
}
