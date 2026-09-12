import { when } from "@/lib/format";
import type { Deal } from "@/lib/diligence/types";
import type { DealIntelligence } from "@/lib/intelligence/types";
import { openQuestions, pendingItems } from "@/lib/intelligence/viewStory";
import { DocumentsTab } from "./DocumentsTab";
import { StoryList } from "./StoryList";
import { Note, Section } from "./ui";

export function ProcessTab({ deal, intel }: { deal?: Deal; intel: DealIntelligence }) {
  const pending = pendingItems(intel);
  const questions = openQuestions(intel);
  const nextMeeting =
    intel.meetings.find((item) => item.when && new Date(item.when).getTime() > Date.now()) ?? intel.meetings[0];

  return (
    <div>
      <Section title="Process" lead="Operations sit beside the analysis. Waiting is a status, not a stage.">
        <Note>Receive a file here. Answer a question here. Neither is Validation itself.</Note>
      </Section>

      <Section title="Pending items" lead="Things we still need to receive.">
        {pending.length === 0 ? (
          <Note>Nothing outstanding to receive.</Note>
        ) : (
          <ul className="attention-list">
            {pending.map((task) => (
              <li key={task.id}>
                <p className="attention-what">{task.title}</p>
                <p>{task.waitingOn ? `Waiting on ${task.waitingOn}.` : `${task.owner} owns this.`}</p>
                <p>{task.deadline ?? task.kind}</p>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Open questions" lead="Things we still need answered.">
        {questions.length === 0 ? (
          <Note>No open questions.</Note>
        ) : (
          <ul className="prose-list">
            {questions.map((item) => (
              <li key={item.id}>
                {item.question}
                <span className="block text-mute">{item.reason}</span>
              </li>
            ))}
          </ul>
        )}
      </Section>

      {nextMeeting ? (
        <Section title="Next meeting">
          <p className="font-serif text-[1.45rem] leading-snug">{nextMeeting.title}</p>
          <p className="mt-2 text-mute">
            {nextMeeting.when ? when(nextMeeting.when) : "unscheduled"} · {nextMeeting.attendees.join(", ")}
          </p>
        </Section>
      ) : null}

      {deal ? <DocumentsTab deal={deal} intel={intel} /> : null}

      <Section title="Deal story">
        <StoryList events={intel.timeline} />
      </Section>
    </div>
  );
}
