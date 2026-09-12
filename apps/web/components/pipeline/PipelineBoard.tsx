"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { DealSummary } from "@/lib/diligence/types";
import { DEAL_STAGES, STAGE_LABELS, type DealStage } from "@/lib/intelligence/types";
import { scoreTone } from "@/lib/intelligence/scores";
import { scoreDisplay } from "@/lib/format";

type Props = {
  deals: DealSummary[];
};

export function PipelineBoard({ deals }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [stage, setStage] = useState<DealStage | "all">("all");
  const [error, setError] = useState<string | null>(null);

  const rows = useMemo(() => {
    const filtered = deals.filter((deal) => (stage === "all" ? true : deal.stage === stage));
    return [...filtered].sort((a, b) => {
      if (a.live !== b.live) return a.live ? -1 : 1;
      const ai = DEAL_STAGES.indexOf(a.stage as DealStage);
      const bi = DEAL_STAGES.indexOf(b.stage as DealStage);
      return (ai < 0 ? 99 : ai) - (bi < 0 ? 99 : bi);
    });
  }, [deals, stage]);

  useEffect(() => {
    let stamp = deals.map((deal) => `${deal.id}:${deal.updatedAt}:${deal.nextAction}`).join("|");
    const tick = window.setInterval(async () => {
      try {
        const res = await fetch("/api/deals", { cache: "no-store" });
        if (!res.ok) return;
        const body = (await res.json()) as { deals?: DealSummary[] };
        const next = (body.deals ?? []).map((deal) => `${deal.id}:${deal.updatedAt}:${deal.nextAction}`).join("|");
        if (next !== stamp) {
          stamp = next;
          router.refresh();
        }
      } catch {
        // Projector keeps the last good blotter if the poll misses.
      }
    }, 3000);
    return () => window.clearInterval(tick);
  }, [deals, router]);

  function reseeds() {
    setError(null);
    startTransition(async () => {
      const res = await fetch("/api/deals/seed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ force: true }),
      });
      if (!res.ok) {
        setError("Could not reload the sample deals.");
        return;
      }
      router.refresh();
    });
  }

  return (
    <section aria-labelledby="pipeline-heading">
      <div className="toolbar">
        <h2 id="pipeline-heading" className="sr-only">
          Deals
        </h2>
        <label>
          Stage
          <select
            value={stage}
            onChange={(event) => setStage(event.target.value as DealStage | "all")}
          >
            <option value="all">All</option>
            {DEAL_STAGES.map((item) => (
              <option key={item} value={item}>
                {STAGE_LABELS[item]}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={reseeds}
          disabled={pending}
          className="text-[0.875rem] text-mute hover:text-paper disabled:opacity-50"
        >
          {pending ? "Reloading…" : "Reset samples"}
        </button>
      </div>

      <div className="pipe-list">
        <div className="pipe-head" aria-hidden="true">
          <span>Company</span>
          <span>Stage</span>
          <span>Conv / risk</span>
          <span>Next</span>
        </div>
        {rows.map((deal) => (
          <Link key={deal.id} href={`/deals/${deal.id}`} className="pipe-row">
            <span className="pipe-name">
              {deal.company || deal.name}
              {deal.live ? <span className="pipe-flag">Live</span> : null}
              {deal.thesisException ? <span className="pipe-flag">Thesis exception</span> : null}
            </span>
            <span className="pipe-stage">{deal.stage ? STAGE_LABELS[deal.stage] : "—"}</span>
            <span className="pipe-score">
              <span className={scoreTone("investmentConviction", deal.investmentConviction)}>
                {scoreDisplay(deal.investmentConviction)}
              </span>
              <span className="text-mute"> / </span>
              <span className={scoreTone("risk", deal.riskScore)}>{scoreDisplay(deal.riskScore)}</span>
            </span>
            <span className="pipe-next">{deal.nextAction ?? "—"}</span>
          </Link>
        ))}
      </div>
      {error ? <p className="mt-3 text-[0.875rem] text-flag-red">{error}</p> : null}
    </section>
  );
}
