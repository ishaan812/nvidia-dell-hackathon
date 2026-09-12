import Link from "next/link";
import { recommendationLabel, scoreDisplay } from "@/lib/format";
import { convictionCopy, effectiveScores, scoreTone } from "@/lib/intelligence/scores";
import type { DealIntelligence, ScoreKey } from "@/lib/intelligence/types";
import { TimelineTab } from "./TimelineTab";
import { ValuationTab } from "./ValuationTab";
import { Note, Section } from "./ui";

const ROOM_SCORES: ScoreKey[] = [
  "investmentConviction",
  "risk",
  "uncertainty",
  "evidenceConfidence",
  "thesisFit",
  "valuationAttractiveness",
  "portfolioFit",
];

const LABELS: Record<ScoreKey, string> = {
  investmentConviction: "Conviction",
  opportunityQuality: "Opportunity",
  risk: "Risk",
  thesisFit: "Thesis fit",
  uncertainty: "Uncertainty",
  evidenceConfidence: "Evidence",
  valuationAttractiveness: "Valuation",
  portfolioFit: "Portfolio fit",
};

export function ICTab({ dealId, intel }: { dealId?: string; intel: DealIntelligence }) {
  const ic = intel.ic;
  const scores = effectiveScores(intel);
  const tooEarly = intel.stage === "source" || intel.stage === "triage";

  return (
    <div>
      <Section title="Decision Room" lead={convictionCopy()}>
        <div className="score-strip">
          {ROOM_SCORES.map((key) => (
            <div key={key}>
              <p className="score-label">{LABELS[key]}</p>
              <p className={`score-value ${scoreTone(key, scores[key])}`}>{scoreDisplay(scores[key])}</p>
            </div>
          ))}
        </div>
      </Section>

      {ic ? (
        <Section title="Investment case">
          <p className="font-serif text-[1.75rem] leading-snug">{recommendationLabel(ic.recommendation)}</p>
          <div className="mt-3">
            <Note>{ic.executiveSummary}</Note>
          </div>
          <p className="mt-4 text-[16px] leading-7">{ic.opportunityQuality}</p>
        </Section>
      ) : (
        <Section title="Investment case">
          <Note>
            {tooEarly
              ? "Too early for a packet. Validation has to land first."
              : "No IC packet on this deal yet. Helio Freight has the full room."}
          </Note>
        </Section>
      )}

      {ic ? (
        <Section title="IC summary">
          <p className="text-[16px] leading-7">{ic.recommendationNote}</p>
          <p className="mt-4 text-[16px] leading-7">
            <span className="text-ledger">Bull. </span>
            {ic.bullCase}
          </p>
          <p className="mt-3 text-[16px] leading-7">
            <span className="text-flag-amber">Bear. </span>
            {ic.bearCase}
          </p>
        </Section>
      ) : null}

      <ValuationTab intel={intel} />

      {intel.portfolio ? (
        <Section title="Portfolio fit">
          <p>{intel.portfolio.sector}</p>
          <p className="mt-2 text-mute">{intel.portfolio.capitalNote}</p>
        </Section>
      ) : null}

      {dealId ? (
        <Section title="Ask the room" lead="Muse Glimmer answers from the files, with citations.">
          <Link href={`/deals/${dealId}?tab=ask`} className="ask-jump">
            Open Ask
          </Link>
        </Section>
      ) : null}

      {ic ? (
        <Section title="Final decision">
          <p className="font-serif text-[1.75rem] leading-snug">{recommendationLabel(ic.recommendation)}</p>
          <p className="mt-3 text-mute">{ic.nextBestAction}</p>
        </Section>
      ) : null}

      <TimelineTab intel={intel} />
    </div>
  );
}
