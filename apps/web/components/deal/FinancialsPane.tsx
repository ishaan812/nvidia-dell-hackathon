import type { Deal } from "@/lib/diligence/types";
import type { DealIntelligence } from "@/lib/intelligence/types";
import { groupDiscrepancies } from "@/lib/intelligence/viewStory";
import { EvidenceTab } from "./EvidenceTab";
import { FindingsTab } from "./FindingsTab";
import { FounderThread } from "./FounderThread";
import { NumbersTab } from "./NumbersTab";
import { RisksTab } from "./RisksTab";
import { Note, Section } from "./ui";

export function FinancialsPane({ deal, intel }: { deal: Deal; intel: DealIntelligence }) {
  const groups = groupDiscrepancies(deal.flags);
  const benches = intel.benchmarks;
  return (
    <div>
      {groups.map((group) => (
        <Section key={group.id} title={group.issue}>
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
      {!groups.length ? (
        <Section title="Financials">
          <Note>No deck versus data-room discrepancies yet.</Note>
        </Section>
      ) : null}
      {deal.flags.length ? <FounderThread dealId={deal.id} intel={intel} flags={deal.flags} /> : null}
      <NumbersTab deal={deal} intel={intel} />
      {benches.length ? (
        <Section title="Benchmarks">
          <ul className="prose-list">
            {benches.map((item) => (
              <li key={item.id}>
                {item.metric} · {item.value}. {item.peer}. {item.note}
              </li>
            ))}
          </ul>
        </Section>
      ) : null}
      <FindingsTab intel={intel} />
      <EvidenceTab intel={intel} />
      <RisksTab intel={intel} />
    </div>
  );
}
