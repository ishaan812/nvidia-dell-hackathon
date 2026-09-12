import type { Deal } from "@/lib/diligence/types";
import type { DealIntelligence } from "@/lib/intelligence/types";
import { groupDiscrepancies, openQuestions, pendingItems } from "@/lib/intelligence/viewStory";
import { EvidenceTab } from "./EvidenceTab";
import { FindingsTab } from "./FindingsTab";
import { FounderThread } from "./FounderThread";
import { NumbersTab } from "./NumbersTab";
import { PeopleTab } from "./PeopleTab";
import { RisksTab } from "./RisksTab";
import { WorldTab } from "./WorldTab";
import { Note, Section } from "./ui";

type Props = { deal: Deal; intel: DealIntelligence };

export function ValidationTab({ deal, intel }: Props) {
  const benches = intel.benchmarks;
  const groups = groupDiscrepancies(deal.flags);
  const pending = pendingItems(intel);
  const questions = openQuestions(intel);
  return (
    <div>
      <Section title="What appears true">
        <Note>
          This room checks the files against the pitch — what is supported, what conflicts, and what is still a guess.
        </Note>
      </Section>
      {groups.map((group) => (
        <Section key={group.id} title={group.issue} lead="Related findings. Each line keeps its own status.">
          <ul className="disc-list">
            {group.findings.map((item) => (
              <li key={item.id}>
                <p>{item.metric}</p>
                {item.deck || item.room ? (
                  <p>
                    Deck: {item.deck ?? "—"}. Data room: {item.room ?? "—"}.
                  </p>
                ) : (
                  <p>{item.comment}</p>
                )}
              </li>
            ))}
          </ul>
        </Section>
      ))}
      {deal.flags.length ? <FounderThread dealId={deal.id} intel={intel} flags={deal.flags} /> : null}
      <Section title="Pending items" lead="Things we still need to receive.">
        {pending.length ? (
          <ul className="prose-list">
            {pending.map((item) => (
              <li key={item.id}>
                {item.title}
                {item.waitingOn ? ` — waiting on ${item.waitingOn}` : ""}
              </li>
            ))}
          </ul>
        ) : (
          <Note>Nothing outstanding to receive.</Note>
        )}
      </Section>
      <Section title="Open questions" lead="Things we still need answered.">
        {questions.length ? (
          <ul className="prose-list">
            {questions.map((item) => (
              <li key={item.id}>{item.question}</li>
            ))}
          </ul>
        ) : (
          <Note>No open questions.</Note>
        )}
      </Section>
      <NumbersTab deal={deal} intel={intel} />
      {benches.length ? (
        <Section title="Benchmarks" lead="External ranges, not facts about this company.">
          <ul className="space-y-3">
            {benches.map((item) => (
              <li key={item.id}>
                <p>
                  {item.metric} · {item.value}
                </p>
                <p className="text-[14px] text-mute">
                  {item.peer}. {item.note}
                </p>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}
      <FindingsTab intel={intel} />
      <EvidenceTab intel={intel} />
      <WorldTab intel={intel} />
      <PeopleTab intel={intel} />
      <RisksTab intel={intel} />
    </div>
  );
}
