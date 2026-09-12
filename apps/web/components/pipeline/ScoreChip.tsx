"use client";

import { scoreTone } from "@/lib/intelligence/scores";
import { SCORE_LABELS, type ScoreKey } from "@/lib/intelligence/types";
import { scoreDisplay } from "@/lib/format";

type Props = {
  scoreKey: ScoreKey;
  value?: number;
  detail?: string;
  compact?: boolean;
};

export function ScoreChip({ scoreKey, value, detail, compact }: Props) {
  return (
    <span className={`inline-flex flex-col ${compact ? "" : "min-w-[3.5rem]"}`}>
      {!compact ? (
        <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-paper/45">
          {SCORE_LABELS[scoreKey]}
        </span>
      ) : null}
      <span className={`font-mono text-[13px] tabular-nums ${scoreTone(scoreKey, value)}`}>
        {scoreDisplay(value)}
      </span>
      {detail ? <span className="sr-only">{detail}</span> : null}
    </span>
  );
}
