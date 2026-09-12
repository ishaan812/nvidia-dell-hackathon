import { when } from "@/lib/format";
import type { TimelineEvent } from "@/lib/intelligence/types";
import { ACTOR_LABEL, storyLine } from "@/lib/intelligence/viewStory";

export function StoryList({ events }: { events: TimelineEvent[] }) {
  if (!events.length) {
    return <p className="text-[16px] leading-7 text-mute">Nothing material has happened yet.</p>;
  }
  return (
    <ol className="story-list">
      {events.map((event) => {
        const line = storyLine(event);
        return (
          <li key={event.id}>
            <p className="story-actor">{ACTOR_LABEL[line.actor]}</p>
            <p className="story-what">{line.what}</p>
            {line.impact && line.impact !== line.what ? <p className="story-impact">{line.impact}</p> : null}
            <p className="story-when">{when(line.at)}</p>
          </li>
        );
      })}
    </ol>
  );
}
