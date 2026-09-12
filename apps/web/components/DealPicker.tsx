"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useState, useTransition } from "react";
import type { DealSummary } from "@/lib/diligence/types";
import { riskTone, when } from "@/lib/format";
import { readJson } from "@/lib/http";
import { BrandLogo } from "./BrandLogo";
import { FileDrop, roleMap, type StagedFile } from "./FileDrop";

type Props = {
  deals: DealSummary[];
  model: { ok: boolean; models: string[] };
  using: string;
  embedded?: boolean;
};

export function DealPicker({ deals, model, using, embedded }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [kind, setKind] = useState<"sample" | "upload" | null>(null);
  const [name, setName] = useState("");
  const [files, setFiles] = useState<StagedFile[]>([]);
  const [error, setError] = useState<string | null>(null);
  const busy = pending || kind !== null;

  function runSample() {
    setKind("sample");
    setError(null);
    startTransition(async () => {
      const res = await fetch("/api/deals/sample", { method: "POST" });
      const data = await readJson(res);
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Could not open the sample room");
        setKind(null);
        return;
      }
      router.push(`/deals/${data.id}`);
      router.refresh();
    });
  }

  function createDeal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!files.length) {
      setError("Add at least one file — mark slides as a deck, everything else stays in the room.");
      return;
    }
    setKind("upload");
    setError(null);
    const form = new FormData();
    if (name.trim()) form.append("name", name.trim());
    for (const item of files) form.append("files", item.file);
    form.append("roles", JSON.stringify(roleMap(files)));
    startTransition(async () => {
      const res = await fetch("/api/deals/upload", { method: "POST", body: form });
      const data = await readJson(res);
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Could not start this deal");
        setKind(null);
        return;
      }
      router.push(`/deals/${data.id}`);
      router.refresh();
    });
  }

  return (
    <div className={embedded ? "" : "min-h-screen bg-desk text-paper"}>
      {embedded ? null : (
        <>
          <a href="#deals" className="skip-link">
            Skip to deals
          </a>
          <header className="mx-auto flex max-w-5xl items-end justify-between px-8 pb-10 pt-14">
            <div>
              <BrandLogo />
              <h1 className="mt-6 font-serif text-5xl font-medium tracking-tight">Open a deal</h1>
              <p className="mt-3 max-w-lg text-[16px] leading-7 text-paper/75">
                Pick a room you already started, or make a new one and upload the files yourself.
                Each deal keeps its own folder.
              </p>
            </div>
            <p className="font-mono text-[12px] text-paper/70">
              {model.ok ? `local · ${using}` : "ollama not reachable"}
            </p>
          </header>
        </>
      )}

      <div className={embedded ? "grid gap-10" : "mx-auto grid max-w-5xl gap-16 px-8 pb-20 md:grid-cols-[1.15fr_0.85fr]"}>
        <section id="deals" aria-labelledby="rooms-heading">
          <h2 id="rooms-heading" className="text-[16px] text-paper/80">
            Your rooms
          </h2>
          {deals.length === 0 ? (
            <p className="mt-8 max-w-sm text-[16px] leading-7 text-paper/70">
              Nothing here yet. Create a deal on the right, or try the Northstar sample.
            </p>
          ) : (
            <ul className="mt-4">
              {deals.map((deal) => {
                const checks = deal.flagCounts.contradiction + deal.flagCounts.unsupported;
                return (
                  <li key={deal.id} className="deal-row">
                    <Link href={`/deals/${deal.id}`} className="block py-5">
                      <div className="flex items-baseline justify-between gap-6">
                        <h3 className="font-serif text-[28px] leading-none">
                          {deal.company || deal.name}
                        </h3>
                        <span className={`font-mono text-[12px] ${riskTone(deal.riskScore)}`}>
                          {deal.riskScore != null ? `risk ${deal.riskScore}` : deal.status}
                        </span>
                      </div>
                      <p className="mt-2 text-[15px] text-paper/70">
                        {checks > 0
                          ? `${checks} ${checks === 1 ? "thing" : "things"} to check`
                          : "First pass is in"}
                        <span className="mx-2 text-paper/35">·</span>
                        {deal.docCount} {deal.docCount === 1 ? "file" : "files"}
                        <span className="mx-2 text-paper/35">·</span>
                        {when(deal.createdAt)}
                      </p>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <aside aria-labelledby="new-deal-heading">
          <h2 id="new-deal-heading" className="text-[16px] text-paper/80">
            Start a new one
          </h2>
          <p className="mt-3 text-[15px] leading-7 text-paper/70">
            Name the company and add files. Mark each PDF or PowerPoint as a deck or leave it in
            the data room. You can add more later.
          </p>
          <form className="mt-6" onSubmit={createDeal}>
            <label htmlFor="deal-name" className="block text-[14px] text-paper/80">
              Company or deal name
            </label>
            <input
              id="deal-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Northstar Robotics"
              autoComplete="organization"
              className="mt-2 w-full border-b border-line bg-transparent py-2 text-[16px] outline-none placeholder:text-mute focus:border-copper"
            />
            <div className="mt-6">
              <FileDrop
                id="new-deal-files"
                label="Add files"
                hint="Spreadsheets and Word stay in the data room. For a PDF or PowerPoint, choose Deck or Data room."
                files={files}
                onFiles={setFiles}
                disabled={busy}
              />
            </div>
            <button
              type="submit"
              disabled={busy || files.length === 0}
              className="mt-5 w-full bg-paper px-5 py-3.5 text-left text-[16px] text-ink hover:bg-white disabled:opacity-50"
            >
              {kind === "upload" ? "Reading the room…" : "Create this deal"}
            </button>
            <button
              type="button"
              onClick={runSample}
              disabled={busy}
              className="mt-3 w-full border border-line px-5 py-3 text-left text-[15px] text-paper hover:border-copper disabled:opacity-50"
            >
              {kind === "sample" ? "Opening Northstar…" : "Try the Northstar sample instead"}
            </button>
            <p role="status" aria-live="polite" className="mt-4 text-[15px]">
              {error ? <span className="text-flag-red">{error}</span> : null}
            </p>
          </form>
        </aside>
      </div>
    </div>
  );
}
