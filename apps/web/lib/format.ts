export function riskTone(score?: number) {
  if (score == null) return "text-mute";
  if (score >= 70) return "text-flag-red";
  if (score >= 50) return "text-flag-amber";
  return "text-ledger";
}

export function when(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
