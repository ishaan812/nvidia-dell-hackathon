"use client";

import { useState, useTransition } from "react";
import type { PptxSlide } from "@/lib/diligence/pptx";
import type { DealRoomView, WorkbookGrid } from "@/lib/diligence/types";
import { riskTone } from "@/lib/format";
import { BrandLogo } from "./BrandLogo";
import { ModelBadge } from "./ModelBadge";
import { FlagList } from "./FlagList";
import { PptxViewer } from "./PptxViewer";
import { SideDesk, type SidePane } from "./SideDesk";

type Props = {
  deal: DealRoomView;
  model?: string;
  flagId?: string | null;
  slides?: PptxSlide[];
  workbook?: WorkbookGrid | null;
};

export function DealRoom({ deal, model, flagId, slides, workbook }: Props) {
  const [pending, startTransition] = useTransition();
  const [pane, setPane] = useState<SidePane>("source");
  const [activeId, setActiveId] = useState<string | null>(flagId ?? deal.flags[0]?.id ?? null);
  const checks = deal.flags.filter((flag) => flag.severity !== "missing").length;
  const active = deal.flags.find((flag) => flag.id === activeId) ?? null;
  const deckName = deal.activeDeck ?? deal.decks[0]?.filename ?? "";
  const isPptx = /\.pptx$/i.test(deckName);
  const page = active?.page && active.page > 0 ? active.page : 1;
  const annotated = `/api/deals/${deal.id}/annotated#page=${page}&view=FitH&zoom=page-width`;
  const original = `/api/deals/${deal.id}/deck${deckName ? `?name=${encodeURIComponent(deckName)}` : ""}`;

  function openFlag(id: string) {
    setActiveId(id);
    setPane("source");
  }

  function recompute() {
    startTransition(async () => {
      const res = await fetch(`/api/deals/${deal.id}/recompute`, { method: "POST" });
      if (res.ok) window.location.reload();
    });
  }

  return (
    <div className="flex h-screen flex-col bg-desk text-paper">
      <header className="flex items-center justify-between gap-6 border-b border-white/10 px-6 py-3">
        <div className="flex min-w-0 items-center gap-4">
          <BrandLogo compact size={18} />
          <a
            href={`/deals/${deal.id}`}
            target="_top"
            className="shrink-0 text-[14px] text-paper/80 underline-offset-2 hover:text-paper hover:underline"
          >
            Back to data room
          </a>
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
                defaultValue={deckName}
                onChange={(event) => {
                  window.location.href = `/deals/${deal.id}/deck?name=${encodeURIComponent(event.target.value)}`;
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
          <a href={original} target="_blank" rel="noreferrer" className="hover:text-paper">
            original
          </a>
          <a href={`/api/deals/${deal.id}/annotated`} target="_blank" rel="noreferrer" className="hover:text-paper">
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
        <FlagList
          flags={deal.flags}
          activeId={activeId}
          hrefFor={(id) =>
            `/deals/${deal.id}/deck?name=${encodeURIComponent(deckName)}&flag=${encodeURIComponent(id)}`
          }
          onSelect={openFlag}
        />
        <main className="min-h-0 h-full min-w-0 overflow-hidden bg-[#d8dee4]">
          {isPptx ? (
            <div className="h-full overflow-y-auto">
              <PptxViewer
                src={`/api/deals/${deal.id}/slides?name=${encodeURIComponent(deckName)}`}
                slides={slides}
                flags={deal.flags}
                activeId={activeId}
                onSelect={openFlag}
              />
            </div>
          ) : (
            <iframe key={annotated} title="Marked deck" src={annotated} className="h-full w-full border-0 bg-[#525659]" />
          )}
        </main>
        <SideDesk
          deal={deal}
          flag={active}
          pane={pane}
          onPane={setPane}
          onOpenFlag={openFlag}
          workbook={workbook}
        />
      </div>
    </div>
  );
}
