import { when } from "@/lib/format";
import type { Deal } from "@/lib/diligence/types";
import type { DealIntelligence } from "@/lib/intelligence/types";
import { DocumentsTab } from "./DocumentsTab";
import { QuestionsTab } from "./QuestionsTab";
import { Note, Section } from "./ui";

export function ProcessTab({ deal, intel }: { deal?: Deal; intel: DealIntelligence }) {
  const activity = intel.timeline.slice(-6).reverse();
  const nextMeeting = intel.meetings.find((item) => item.when && new Date(item.when).getTime() > Date.now()) ?? intel.meetings[0];
  return (
    <div>
      <Section title="Process" lead="The operational layer. It runs alongside Source, Triage, Validation, and Decision — not as a founder-loop stage.">
        {intel.tasks.length === 0 ? (
          <Note>No tasks yet.</Note>
        ) : (
          <ul className="divide-y divide-white/10">
            {intel.tasks.map((task) => (
              <li key={task.id} className="flex flex-wrap items-baseline justify-between gap-3 py-4">
                <div>
                  <p className="kind-pill">
                    {task.status} · {task.kind}
                  </p>
                  <p className="mt-2 text-[16px]">{task.title}</p>
                  {task.waitingOn ? (
                    <p className="mt-1 text-[14px] text-flag-amber">Waiting on {task.waitingOn}</p>
                  ) : null}
                </div>
                <p className="font-mono text-[12px] text-paper/50">
                  {task.owner}
                  {task.deadline ? ` · ${task.deadline}` : ""}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Section>
      <Section title="Meetings">
        {intel.meetings.length === 0 ? (
          <Note>No meetings booked.</Note>
        ) : (
          <ul className="space-y-3">
            {intel.meetings.map((m) => (
              <li key={m.id}>
                <p className="text-[16px]">{m.title}</p>
                <p className="font-mono text-[12px] text-paper/50">
                  {m.when ? when(m.when) : "unscheduled"} · {m.attendees.join(", ")}
                </p>
                {m.notes ? <p className="mt-1 text-[14px] text-paper/70">{m.notes}</p> : null}
              </li>
            ))}
          </ul>
        )}
      </Section>
      {nextMeeting ? (
        <Section title="Next meeting">
          <p className="font-serif text-[1.5rem] leading-snug">{nextMeeting.title}</p>
          <p className="mt-2 text-mute">
            {nextMeeting.when ? when(nextMeeting.when) : "unscheduled"} · {nextMeeting.attendees.join(", ")}
          </p>
        </Section>
      ) : null}

      {deal ? <QuestionsTab dealId={deal.id} intel={intel} /> : null}

      {activity.length ? (
        <Section title="Activity">
          <ul className="space-y-3">
            {activity.map((event) => (
              <li key={event.id}>
                <p>{event.title}</p>
                <p className="text-[14px] text-mute">{event.body}</p>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      {deal ? <DocumentsTab deal={deal} intel={intel} /> : null}

      <Section title="Document versions">
        {intel.versions.length === 0 ? (
          <Note>No versions stored.</Note>
        ) : (
          <ul className="space-y-3">
            {intel.versions.map((v) => (
              <li key={v.id}>
                <p>
                  {v.filename} · {v.version}
                </p>
                <p className="text-[14px] text-paper/65">
                  {v.note}
                  {v.changedValues?.length ? ` — ${v.changedValues.join("; ")}` : ""}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}
