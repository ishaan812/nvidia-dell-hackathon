"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useState, useTransition } from "react";
import type { DealFile, DealLobbyView, FileRole } from "@/lib/diligence/types";
import { riskTone } from "@/lib/format";
import { readJson } from "@/lib/http";
import { BrandLogo } from "./BrandLogo";
import { FileDrop, roleMap, type StagedFile } from "./FileDrop";
import { ModelBadge } from "./ModelBadge";
import { RoomDesk, type RoomDeskTab } from "./RoomDesk";

const KIND: Record<DealFile["kind"], string> = {
  deck: "Pitch deck",
  financials: "Financials",
  cap_table: "Cap table",
  metrics: "Operating metrics",
  other: "File",
};

type Props = {
  deal: DealLobbyView;
  model?: string;
  embedded?: boolean;
};

export function DealLobby({ deal, model, embedded = false }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [incoming, setIncoming] = useState<StagedFile[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [tab, setTab] = useState<RoomDeskTab>("graph");
  const file =
    deal.room.find((item) => item.filename === selected) ??
    deal.decks.find((item) => item.filename === selected);
  const preview = selected ? deal.previews[selected] : undefined;

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setSelected(null);
        setTab("graph");
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function openFile(filename: string) {
    setSelected(filename);
    setTab("file");
  }

  function addToRoom(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!incoming.length) {
      setError("Choose the files you want to add.");
      return;
    }
    setError(null);
    setMessage("Adding files and re-reading the room…");
    const form = new FormData();
    for (const item of incoming) form.append("files", item.file);
    form.append("roles", JSON.stringify(roleMap(incoming)));
    startTransition(async () => {
      const res = await fetch(`/api/deals/${deal.id}/files`, { method: "POST", body: form });
      const data = await readJson(res);
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Could not add those files");
        setMessage(null);
        return;
      }
      setIncoming([]);
      const files = Array.isArray(data.files) ? data.files : [];
      setMessage(`Added. This room now has ${files.length || "updated"} files. Recompute the deck to mark them.`);
      router.refresh();
    });
  }

  function recompute() {
    setError(null);
    setMessage("Re-reading the room and marking the deck…");
    startTransition(async () => {
      const res = await fetch(`/api/deals/${deal.id}/recompute`, { method: "POST" });
      const data = await readJson(res);
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Could not recompute the deck");
        setMessage(null);
        return;
      }
      const flags = typeof data.flags === "number" ? data.flags : "updated";
      setMessage(`Recomputed. ${flags} findings on the deck.`);
      router.refresh();
    });
  }

  function moveFile(filename: string, role: FileRole) {
    setError(null);
    setMessage(role === "deck" ? `Moving ${filename} to decks…` : `Moving ${filename} to the data room…`);
    startTransition(async () => {
      const res = await fetch(`/api/deals/${deal.id}/role`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename, role }),
      });
      const data = await readJson(res);
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Could not move that file");
        setMessage(null);
        return;
      }
      setMessage(role === "deck" ? `${filename} is now a deck.` : `${filename} is in the data room.`);
      router.refresh();
    });
  }

  return (
    <div className="bg-desk text-paper">
      {embedded ? null : (
        <a href="#data-room" className="skip-link">
          Skip to data room
        </a>
      )}
      <div className="lobby-split is-open">
        <section className="lobby-files">
          <header className={`flex items-end justify-between gap-6 ${embedded ? "pb-4" : "pb-8"}`}>
            <div>
              {embedded ? (
                <p className="text-[15px] leading-7 text-paper/75">
                  Click a file — or a node on the desk — to read it.
                </p>
              ) : (
                <>
                  <BrandLogo />
                  <p className="mt-5 text-[15px] text-paper/75">
                    <Link
                      href={`/deals/${deal.id}`}
                      className="underline-offset-2 hover:text-paper hover:underline"
                    >
                      Deal desk
                    </Link>
                  </p>
                  <h1 className="mt-2 font-serif text-4xl font-medium tracking-tight">
                    {deal.company || deal.name}
                  </h1>
                  <p className="mt-3 text-[15px] leading-7 text-paper/75">
                    The graph is on the desk. Click a file — or a node — to read it.
                  </p>
                </>
              )}
            </div>
            <div className="flex shrink-0 flex-col items-end gap-3">
              {embedded ? null : <ModelBadge name={model} />}
              <p className={`font-mono text-[12px] ${riskTone(deal.riskScore)}`}>
                {deal.riskScore != null ? `risk ${deal.riskScore}` : deal.status}
              </p>
              <button
                type="button"
                disabled={pending}
                onClick={recompute}
                className="pressable border border-line px-3 py-2 text-[13px] text-mute hover:text-paper disabled:opacity-50"
              >
                {pending ? "Recomputing…" : "Recompute the deck"}
              </button>
            </div>
          </header>
          <div className="deck-card">
            <p className="font-mono text-[11px] text-copper">
              {deal.decks.length === 1 ? "The deck" : "Decks"}
            </p>
            {deal.decks.length === 0 ? (
              <p className="mt-3 text-[16px] leading-7 text-paper/70">
                No deck yet. When you add a PDF or PowerPoint, mark it as a deck. Word and Excel
                stay in the data room.
              </p>
            ) : (
              <ul className="deck-list mt-3">
                {deal.decks.map((item) => {
                  const on = selected === item.filename;
                  return (
                    <li key={item.filename} className={`deal-row ${on ? "is-on" : ""}`}>
                      <div className="flex items-start justify-between gap-4 py-4">
                        <a
                          href={`/deals/${deal.id}/deck?name=${encodeURIComponent(item.filename)}`}
                          target="_top"
                          className="min-w-0 text-left"
                        >
                          <span className="role-badge is-deck">Deck</span>
                          <span className={`mt-2 block font-serif text-[26px] leading-none ${on ? "text-paper" : "text-paper/80"}`}>
                            {item.filename}
                          </span>
                        </a>
                        <div className="flex flex-wrap justify-end gap-2">
                          <a
                            href={`/deals/${deal.id}/deck?name=${encodeURIComponent(item.filename)}`}
                            target="_top"
                            className="pressable bg-paper px-4 py-2.5 text-[14px] text-ink hover:bg-white"
                          >
                            {deal.decks.length === 1 ? "Open the deck" : "Open"}
                          </a>
                          <button
                            type="button"
                            disabled={pending}
                            onClick={() => moveFile(item.filename, "room")}
                            className="border border-white/15 px-3 py-2.5 text-[13px] text-paper/75 hover:text-paper"
                          >
                            Move to data room
                          </button>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
            <div className="mt-5">
              <p className="text-[14px] leading-6 text-paper/55">
                {deal.decks.length
                  ? "Open the deck for the marked slides. Click any other file to read it here."
                  : "Add a PDF and mark it as a deck when you want the slide review."}
              </p>
            </div>
          </div>

          <h2 id="data-room" className="mt-10 text-[16px] text-paper/80">
            Data room
          </h2>
          {deal.room.length === 0 ? (
            <p className="mt-4 text-[16px] text-paper/70">No supporting files in this room yet. Add some below.</p>
          ) : (
            <ul className="mt-3">
              {deal.room.map((item) => {
                const on = selected === item.filename;
                const slides = /\.(pdf|pptx|ppt)$/i.test(item.filename);
                return (
                  <li key={item.filename} className={`deal-row ${on ? "is-on" : ""}`}>
                    <div className="flex items-start justify-between gap-4 py-4">
                      <a
                        href={`/deals/${deal.id}/preview?name=${encodeURIComponent(item.filename)}`}
                        target="_top"
                        aria-current={on ? "true" : undefined}
                        className="min-w-0 flex-1 text-left"
                      >
                        <div className="flex items-baseline justify-between gap-4">
                          <span className={`font-serif text-[22px] ${on ? "text-paper" : "text-paper/80"}`}>
                            {item.filename}
                          </span>
                          <span className="role-badge is-room">{KIND[item.kind]}</span>
                        </div>
                        <p className="mt-1 font-mono text-[12px] text-paper/65">
                          Data room
                          {item.sheets.length ? ` · ${item.sheets.join(" · ")}` : ""}
                          {item.metrics.length ? ` · ${item.metrics.join(", ")}` : ""}
                        </p>
                      </a>
                      {slides ? (
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() => moveFile(item.filename, "deck")}
                          className="shrink-0 border border-white/15 px-3 py-2 text-[13px] text-paper/75 hover:text-paper"
                        >
                          Use as deck
                        </button>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          <form className="mt-8" onSubmit={addToRoom} aria-labelledby="add-files-heading">
            <h3 id="add-files-heading" className="text-[16px] text-paper/80">
              Add files
            </h3>
            <p className="mt-2 text-[15px] leading-7 text-paper/70">
              Drop a model, cap table, extra exhibit, or another deck. Mark PDFs and PowerPoints
              as a deck or leave them in the data room.
            </p>
            <div className="mt-4">
              <FileDrop
                id="room-files"
                label="Choose or drop files"
                hint="New files default to the data room. Switch a PDF or PowerPoint to Deck if it is slides."
                files={incoming}
                onFiles={setIncoming}
                disabled={pending}
              />
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={pending || incoming.length === 0}
                className="pressable bg-paper px-4 py-2.5 text-[15px] text-ink hover:bg-white disabled:opacity-50"
              >
                {pending ? "Adding…" : "Add these files"}
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={recompute}
                className="border border-white/20 px-4 py-2.5 text-[15px] text-paper/80 hover:text-paper disabled:opacity-50"
              >
                {pending ? "Recomputing…" : "Recompute the deck"}
              </button>
            </div>
            <p role="status" aria-live="polite" className="mt-3 text-[15px]">
              {error ? <span className="text-flag-red">{error}</span> : null}
              {message ? <span className="text-paper/80">{message}</span> : null}
            </p>
          </form>

        </section>

        <RoomDesk
          deal={deal}
          tab={tab}
          onTab={setTab}
          file={file}
          preview={preview}
          onOpenFile={openFile}
          onCloseFile={() => {
            setSelected(null);
            setTab("graph");
          }}
          onOpenDeck={() =>
            router.push(
              deal.decks[0]
                ? `/deals/${deal.id}/deck?name=${encodeURIComponent(deal.decks[0].filename)}`
                : `/deals/${deal.id}`,
            )
          }
        />
      </div>
    </div>
  );
}
