import { STAGE_DEFS, STAGE_LABELS } from "@/lib/intelligence/stage";
import type { DealIntelligence } from "@/lib/intelligence/types";
import { List, Section } from "./ui";

export function StageTab({ intel }: { intel: DealIntelligence }) {
  const def = STAGE_DEFS[intel.stage];
  return (
    <div>
      <Section title={STAGE_LABELS[intel.stage]} lead="Entry, work, and exit for the current stage.">
        <div className="grid gap-8 md:grid-cols-2">
          <div>
            <h3 className="font-mono text-[11px] uppercase tracking-[0.08em] text-copper">Entry</h3>
            <div className="mt-3">
              <List items={def.entryCriteria} />
            </div>
          </div>
          <div>
            <h3 className="font-mono text-[11px] uppercase tracking-[0.08em] text-copper">Exit</h3>
            <div className="mt-3">
              <List items={def.exitCriteria} />
            </div>
          </div>
        </div>
      </Section>
      <Section title="Expected inputs">
        <List items={def.expectedInputs} />
      </Section>
      <Section title="Expected documents">
        <List items={def.expectedDocuments} />
      </Section>
      <Section title="AI checks">
        <List items={def.aiChecks} />
      </Section>
      <Section title="Open questions">
        <List items={def.openQuestions} />
      </Section>
      <Section title="Required actions">
        <List items={def.requiredActions} />
      </Section>
      <Section title="Possible next states">
        <List items={def.nextStates.map((s) => STAGE_LABELS[s])} />
      </Section>
    </div>
  );
}
