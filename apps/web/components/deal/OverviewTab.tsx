"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import type { Deal } from "@/lib/diligence/types";
import { convictionCopy, effectiveScores } from "@/lib/intelligence/scores";
import type { DealIntelligence, ScoreKey } from "@/lib/intelligence/types";
import { recommendationLabel, scoreDisplay } from "@/lib/format";
import { scoreTone } from "@/lib/intelligence/scores";
import { Note, Section } from "./ui";

const DEMO_SCORES: ScoreKey[] = ["investmentConviction", "opportunityQuality", "risk", "thesisFit"];
const LABELS: Record<ScoreKey, string> = {
  investmentConviction: "Conviction",
  opportunityQuality: "Opportunity",
  risk: "Risk",
  thesisFit: "Thesis",
  uncertainty: "Uncertainty",
  evidenceConfidence: "Evidence",
  valuationAttractiveness: "Valuation",
  portfolioFit: "Portfolio",
};

type Props = { deal: Deal; intel: DealIntelligence };

export function OverviewTab({ deal, intel }: Props) {
  const scores = effectiveScores(intel);
  const waiting = intel.tasks.filter((t) => t.status !== "done").slice(0, 3);
  const people = intel.people[0];

  return (
    <div>
      <Section title="The case" lead={convictionCopy()}>
        <div className="score-strip">
          {DEMO_SCORES.map((key) => (
            <div key={key}>
              <p className="score-label">{LABELS[key]}</p>
              <p className={`score-value ${scoreTone(key, scores[key])}`}>
                {scoreDisplay(scores[key])}
              </p>
            </div>
          ))}
        </div>
        {intel.thesis.exceptions.length ? (
          <p className="mt-6 font-medium text-flag-amber">
            Thesis exception — still evaluating. This is not a rejection.
          </p>
        ) : null}
        {intel.triage ? (
          <p className="mt-4 text-[16px] leading-7">
            {recommendationLabel(intel.triage.outcome)}. {intel.triage.note}
          </p>
        ) : null}
      </Section>

      <Section title="Do next">
        <p className="font-serif text-[1.75rem] leading-snug">{intel.nextAction.title}</p>
        <div className="mt-3">
          <Note>{intel.nextAction.reason}</Note>
        </div>
      </Section>

      {waiting.length ? (
        <Section title="Waiting on">
          <ul className="space-y-3">
            {waiting.map((task) => (
              <li key={task.id}>
                <p>{task.title}</p>
                <p className="text-[14px] text-mute">
                  {task.waitingOn ?? task.owner}
                </p>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      {people ? (
        <Section title="People">
          <p className="text-[16px] leading-7">{people.claim}</p>
          <p className="mt-2 text-mute">{people.assessment}</p>
        </Section>
      ) : null}

      {deal.id === "northstar-robotics" ? <FounderReply intel={intel} dealId={deal.id} /> : null}
    </div>
  );
}

function FounderReply({ dealId, intel }: { dealId: string; intel: DealIntelligence }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  if (intel.founderReplyApplied) {
    return (
      <Section title="Founder reply">
        <p className="text-ledger">ARR restated. Conviction updated. Next: cohort workbook.</p>
      </Section>
    );
  }
  return (
    <Section title="Founder reply" lead="Northstar sent a restated ARR definition.">
      <button
        type="button"
        disabled={pending}
        className="bg-paper px-4 py-3 text-[15px] text-ink disabled:opacity-50"
        onClick={() =>
          start(async () => {
            await fetch(`/api/deals/${dealId}/founder-reply`, { method: "POST" });
            router.refresh();
          })
        }
      >
        {pending ? "Applying…" : "Apply the ARR reply"}
      </button>
    </Section>
  );
}
