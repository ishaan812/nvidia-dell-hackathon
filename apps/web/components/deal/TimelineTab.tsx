import { scoreKeyLabel, when } from "@/lib/format";
import type { DealIntelligence } from "@/lib/intelligence/types";
import { StoryList } from "./StoryList";
import { Note, Section } from "./ui";

export function TimelineTab({ intel }: { intel: DealIntelligence }) {
  return (
    <div>
      <Section title="Deal story">
        <StoryList events={intel.timeline} />
      </Section>
      <Section title="What moved the scores" lead="Only material changes. Previous value, new value, and why.">
        {intel.scoreChanges.length === 0 ? (
          <Note>No material score history yet.</Note>
        ) : (
          <ul className="change-list">
            {intel.scoreChanges.map((change) => (
              <li key={change.id}>
                <span>{(change.next ?? 0) >= (change.previous ?? 0) ? "+" : "−"}</span>
                {scoreKeyLabel(change.key)} {change.previous ?? "—"} → {change.next ?? "—"}. {change.reason}
                <em>
                  {when(change.date)}
                  {change.evidence ? ` · ${change.evidence}` : ""}
                </em>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}
