import type { Flag } from "@/lib/diligence/types";
import { STAGE_LABELS, normalizeStage, type DealIntelligence } from "@/lib/intelligence/types";
import { headerScores, plainAction } from "@/lib/intelligence/viewStory";
import { ScoreValue } from "./ScoreValue";

type Props = {
  intel: DealIntelligence;
  flags: Flag[];
  waiting?: string;
};

export function DealHeader({ intel, flags, waiting }: Props) {
  const stage = normalizeStage(intel.stage);
  const scores = headerScores(intel, flags);

  return (
    <div className="deal-head">
      <p className="deal-head-stage">
        {STAGE_LABELS[stage]}
        {waiting ? ` · ${waiting}` : ""}
      </p>
      <h1>{intel.profile.company}</h1>
      <p className="deal-head-next">{plainAction(intel.nextAction.title)}</p>
      <ul className="score-plain">
        {scores.map((row) => (
          <li key={row.key}>
            <p>{row.label}</p>
            <p>
              <ScoreValue value={row.value} />
            </p>
            <p>{row.note}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
