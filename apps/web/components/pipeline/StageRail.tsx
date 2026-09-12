import { DEAL_STAGES, STAGE_LABELS, type DealStage } from "@/lib/intelligence/types";

type Props = {
  current: DealStage;
};

export function StageRail({ current }: Props) {
  const here = DEAL_STAGES.indexOf(current);
  return (
    <ol className="stage-rail" aria-label="Deal stage">
      {DEAL_STAGES.map((stage, index) => {
        const state = index < here ? "done" : index === here ? "now" : "next";
        return (
          <li key={stage} className={`stage-rail-item is-${state}`}>
            {STAGE_LABELS[stage]}
          </li>
        );
      })}
    </ol>
  );
}
