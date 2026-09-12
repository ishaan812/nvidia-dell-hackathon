import { scoreBand, scoreTone } from "@/lib/intelligence/viewStory";

type Props = {
  value?: number;
  label?: string;
  className?: string;
};

export function ScoreValue({ value, label, className }: Props) {
  const n = value == null ? "—" : Math.round(value);
  const band = scoreBand(value);
  return (
    <span
      className={`score-val is-${scoreTone(value)}${className ? ` ${className}` : ""}`}
      title={label ? `${label}: ${band}` : band}
      aria-label={label ? `${label} ${n}, ${band}` : `${n}, ${band}`}
    >
      {n}
    </span>
  );
}
