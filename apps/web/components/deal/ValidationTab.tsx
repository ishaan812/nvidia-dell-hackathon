import type { Deal } from "@/lib/diligence/types";
import type { DealIntelligence } from "@/lib/intelligence/types";
import { EvidenceTab } from "./EvidenceTab";
import { FindingsTab } from "./FindingsTab";
import { NumbersTab } from "./NumbersTab";
import { PeopleTab } from "./PeopleTab";
import { QuestionsTab } from "./QuestionsTab";
import { RisksTab } from "./RisksTab";
import { WorldTab } from "./WorldTab";
import { Note, Section } from "./ui";

type Props = { deal: Deal; intel: DealIntelligence };

export function ValidationTab({ deal, intel }: Props) {
  const benches = intel.benchmarks;
  return (
    <div>
      <Section
        title="Validation"
        lead="Financials, market, customers, competition, product, team, and the outside world — one room, not four stages."
      >
        <Note>
          Pending items and founder replies live across every stage. A new answer re-runs the affected checks.
        </Note>
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
      <QuestionsTab dealId={deal.id} intel={intel} />
    </div>
  );
}
