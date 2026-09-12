import { recommendationLabel } from "@/lib/format";
import { StoryList } from "./StoryList";
import { decisionCopy, plainAction } from "@/lib/intelligence/viewStory";
import type { DealIntelligence } from "@/lib/intelligence/types";
import { Note, Section } from "./ui";

export function ICTab({ intel }: { intel: DealIntelligence }) {
  const ic = intel.ic;
  const copy = decisionCopy(intel);
  const tooEarly = intel.stage === "source" || intel.stage === "triage";

  return (
    <div>
      <Section title="Next action">
        <p className="font-serif text-[1.45rem] leading-snug">{plainAction(copy.next)}</p>
        <div className="mt-3">
          <Note>{plainAction(copy.why)}</Note>
        </div>
        {ic ? <p className="mt-4 text-mute">{recommendationLabel(ic.recommendation)}</p> : null}
      </Section>

      <Section title="The case">
        {ic ? (
          <div className="view-copy">
            <p>{ic.executiveSummary}</p>
          </div>
        ) : (
          <Note>
            {tooEarly
              ? "Too early for a write-up. Diligence has to land first."
              : copy.view.like || "The case is still being written from the files."}
          </Note>
        )}
      </Section>

      {copy.like.length ? (
        <Section title="Why we like it">
          <ul className="prose-list">
            {copy.like.filter(Boolean).map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </Section>
      ) : null}

      {copy.concern.length ? (
        <Section title="What concerns us">
          <ul className="prose-list">
            {copy.concern.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </Section>
      ) : null}

      {copy.unknown.length ? (
        <Section title="What we don't know">
          <ul className="prose-list">
            {copy.unknown.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </Section>
      ) : null}

      <Section title="Deal story">
        <StoryList events={intel.timeline} />
      </Section>
    </div>
  );
}
