import { scoreKeyLabel, when } from "@/lib/format";
import type { DealIntelligence } from "@/lib/intelligence/types";
import { Note, Section } from "./ui";

export function TimelineTab({ intel }: { intel: DealIntelligence }) {
  const conviction = intel.scoreChanges.filter((c) => c.key === "investmentConviction");
  return (
    <div>
      <Section
        title="What changed my mind"
        lead="Every material score change keeps previous value, new value, reason, evidence, date, and source."
      >
        {intel.scoreChanges.length === 0 ? (
          <Note>No score history yet.</Note>
        ) : (
          <ul className="divide-y divide-white/10">
            {intel.scoreChanges.map((change) => (
              <li key={change.id} className="py-4">
                <p className="font-serif text-xl">
                  {scoreKeyLabel(change.key)} {change.previous ?? "—"} → {change.next ?? "—"}
                </p>
                <p className="mt-1 text-[15px] text-paper/75">{change.reason}</p>
                <p className="mt-1 font-mono text-[11px] text-paper/45">
                  {when(change.date)} · {change.source}
                  {change.evidence ? ` · ${change.evidence}` : ""}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Section>
      {conviction.length > 1 ? (
        <Section title="Conviction walk">
          <p className="font-serif text-4xl">
            {conviction[0]?.next} → {conviction[conviction.length - 1]?.next}
          </p>
          <ul className="mt-4 space-y-2 text-[15px]">
            {conviction.slice(1).map((c) => {
              const delta =
                c.previous != null && c.next != null ? c.next - c.previous : null;
              return (
                <li key={c.id}>
                  {c.reason}
                  {delta != null ? `: ${delta > 0 ? "+" : ""}${delta}` : ""}
                </li>
              );
            })}
          </ul>
        </Section>
      ) : null}
      <Section title="Deal timeline">
        {intel.timeline.length === 0 ? (
          <Note>Empty.</Note>
        ) : (
          <ol className="space-y-4">
            {intel.timeline.map((event) => (
              <li key={event.id}>
                <p className="font-mono text-[11px] text-paper/45">{when(event.at)}</p>
                <p className="text-[16px]">{event.title}</p>
                <p className="text-[14px] text-paper/65">{event.body}</p>
              </li>
            ))}
          </ol>
        )}
      </Section>
    </div>
  );
}
