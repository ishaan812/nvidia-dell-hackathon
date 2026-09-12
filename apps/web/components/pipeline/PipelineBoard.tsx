"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { DealSummary } from "@/lib/diligence/types";
import { STAGE_LABELS, type DealStage } from "@/lib/intelligence/types";
import { pipelineBucket, plainAction, type PipelineBucket } from "@/lib/intelligence/viewStory";
import { ScoreValue } from "../deal/ScoreValue";

function pipeScores(deal: DealSummary) {
  return [
    { key: "thesis", label: "Thesis", value: deal.thesisFit },
    { key: "conviction", label: "Conviction", value: deal.convictionScore ?? deal.investmentConviction },
    { key: "opportunity", label: "Opportunity", value: deal.opportunityQuality },
    { key: "diligence", label: "Diligence", value: deal.diligenceScore },
  ] as const;
}

type Props = {
  deals: DealSummary[];
};

const BUCKETS: { id: PipelineBucket; title: string; lead: string }[] = [
  { id: "attention", title: "Needs your attention", lead: "Someone has to move these." },
  { id: "review", title: "Ready for review", lead: "The file is far enough along to read." },
  { id: "waiting", title: "Waiting", lead: "We need a file or an answer. Not a new stage." },
  { id: "updated", title: "Recently updated", lead: "Changed, but not asking you yet." },
];

export function PipelineBoard({ deals }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const grouped = useMemo(() => {
    const map: Record<PipelineBucket, DealSummary[]> = {
      attention: [],
      review: [],
      waiting: [],
      updated: [],
    };
    for (const deal of deals) map[pipelineBucket(deal)].push(deal);
    return map;
  }, [deals]);

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
        /* keep last blotter */
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
        <button
          type="button"
          onClick={reseeds}
          disabled={pending}
          className="text-[0.875rem] text-mute hover:text-paper disabled:opacity-50"
        >
          {pending ? "Reloading…" : "Reset samples"}
        </button>
      </div>

      {BUCKETS.map((bucket) => {
        const rows = grouped[bucket.id];
        if (!rows.length) return null;
        return (
          <div key={bucket.id} className="pipe-bucket">
            <h3>{bucket.title}</h3>
            <p>{bucket.lead}</p>
            <div className="pipe-list">
              <div className="pipe-head" aria-hidden="true">
                <span>Deal</span>
                <span>Stage</span>
                {pipeScores(rows[0]!).map((row) => (
                  <span key={row.key}>{row.label}</span>
                ))}
                <span>Next</span>
              </div>
              {rows.map((deal) => (
                <a key={deal.id} href={`/deals/${deal.id}`} target="_top" className="pipe-row">
                  <span className="pipe-name">
                    {deal.company || deal.name}
                    {deal.live ? <span className="pipe-flag">Live</span> : null}
                    {deal.thesisException ? <span className="pipe-flag">Thesis exception</span> : null}
                  </span>
                  <span className="pipe-stage">{deal.stage ? STAGE_LABELS[deal.stage as DealStage] : "—"}</span>
                  {pipeScores(deal).map((row) => (
                    <ScoreValue key={row.key} value={row.value} label={row.label} />
                  ))}
                  <span className="pipe-next">{plainAction(deal.nextAction)}</span>
                </a>
              ))}
            </div>
          </div>
        );
      })}
      {error ? <p className="mt-3 text-[0.875rem] text-flag-red">{error}</p> : null}
    </section>
  );
}
