"use client";

import { useId, useState } from "react";
import type { ScoreKey } from "@/lib/intelligence/types";
import { band } from "@/lib/intelligence/viewStory";

type Kind = "conviction" | "risk" | "evidence";

type Props = {
  kind: Kind;
  value?: number;
  compact?: boolean;
  delta?: number;
  concern?: string;
  detail?: {
    current?: number;
    previous?: number | null;
    reason?: string;
    evidence?: string;
  };
};

const TITLE: Record<Kind, string> = {
  conviction: "Investment conviction",
  risk: "Risk",
  evidence: "Evidence confidence",
};

const HINT: Record<Kind, string> = {
  conviction: "How compelling the case is now — not the chance we write the check.",
  risk: "How much can go wrong, given what we already see.",
  evidence: "How complete and consistent the file is.",
};

export function Meter({ kind, value, compact = false, delta, concern, detail }: Props) {
  const [open, setOpen] = useState(false);
  const uid = useId();
  const n = value ?? 0;
  const ready = value != null;
  const angle = Math.PI - (Math.max(0, Math.min(100, n)) / 100) * Math.PI;
  const cx = 50;
  const cy = 46;
  const r = 34;
  const x = cx + r * Math.cos(angle);
  const y = cy - r * Math.sin(angle);
  const tone = kind === "risk" ? riskTone(n) : goodTone(n);
  const label = band(kind, value);
  const expandable = Boolean(detail) && !compact;
  const face = (
    <>
      <svg viewBox="0 0 100 58" className="meter-svg" aria-hidden="true">
        <path d="M16 46 A34 34 0 0 1 84 46" className="meter-track" fill="none" />
        {ready ? <path d={`M16 46 A34 34 0 0 1 ${x.toFixed(1)} ${y.toFixed(1)}`} className="meter-arc" fill="none" /> : null}
        <line x1={cx} y1={cy} x2={x} y2={y} className="meter-needle" />
        <circle cx={cx} cy={cy} r="2.2" className="meter-hub" />
      </svg>
      <span className="meter-label">{TITLE[kind]}</span>
      <span className="meter-band">
        {label}
        {ready ? <em>{n}</em> : null}
      </span>
      {!compact && delta != null && delta !== 0 ? (
        <span className="meter-delta">
          {delta > 0 ? "↑" : "↓"} {delta > 0 ? "+" : ""}
          {delta} since last review
        </span>
      ) : null}
      {!compact && concern ? <span className="meter-note">{concern}</span> : null}
    </>
  );

  return (
    <div className={`meter ${compact ? "is-compact" : ""} ${tone}`}>
      {expandable ? (
        <button
          type="button"
          className="meter-face"
          aria-expanded={open}
          aria-controls={uid}
          onClick={() => setOpen((v) => !v)}
        >
          {face}
        </button>
      ) : (
        <div className="meter-face">{face}</div>
      )}
      {open && detail ? (
        <div id={uid} className="meter-detail">
          <p>{HINT[kind]}</p>
          <p>
            Now {detail.current ?? "—"}. Before {detail.previous ?? "—"}.
          </p>
          {detail.reason ? <p>{detail.reason}</p> : null}
          {detail.evidence ? <p>{detail.evidence}</p> : null}
        </div>
      ) : null}
    </div>
  );
}

export function MeterRow({
  conviction,
  risk,
  evidence,
  convictionDelta,
  riskConcern,
  details,
  compact,
}: {
  conviction?: number;
  risk?: number;
  evidence?: number;
  convictionDelta?: number;
  riskConcern?: string;
  details?: Partial<Record<ScoreKey, Props["detail"]>>;
  compact?: boolean;
}) {
  return (
    <div className={`meter-row ${compact ? "is-compact" : ""}`}>
      <Meter kind="conviction" value={conviction} compact={compact} delta={convictionDelta} detail={details?.investmentConviction} />
      <Meter kind="risk" value={risk} compact={compact} concern={riskConcern} detail={details?.risk} />
      <Meter kind="evidence" value={evidence} compact={compact} detail={details?.evidenceConfidence} />
    </div>
  );
}

function goodTone(n: number) {
  if (n >= 70) return "is-good";
  if (n >= 45) return "is-mid";
  return "is-bad";
}

function riskTone(n: number) {
  if (n >= 70) return "is-bad";
  if (n >= 50) return "is-mid";
  return "is-good";
}
