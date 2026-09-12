import { DEAL_STAGES, STAGE_LABELS, type DealStage } from "@/lib/intelligence/types";
import { stageMark } from "@/lib/intelligence/stage";

type Props = {
  current: DealStage;
  validated?: boolean;
  decided?: boolean;
};

export function StageRail({ current, validated, decided }: Props) {
  return (
    <ol className="stage-rail" aria-label="Deal stage">
      {DEAL_STAGES.map((stage) => {
        const state = stageMark(stage, current, { validated, decided });
        return (
          <li key={stage} className={`stage-rail-item is-${state}`}>
            <span className="stage-rail-mark" aria-hidden="true">
              {state === "done" ? "✓" : state === "now" ? "●" : "○"}
            </span>
            <span>{STAGE_LABELS[stage]}</span>
            {state === "done" ? <span className="sr-only"> done</span> : null}
            {state === "now" ? <span className="sr-only"> current</span> : null}
          </li>
        );
      })}
    </ol>
  );
}
