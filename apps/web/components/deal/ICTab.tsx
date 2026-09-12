import { recommendationLabel, scoreDisplay } from "@/lib/format";
import type { DealIntelligence } from "@/lib/intelligence/types";
import { Note, Section } from "./ui";

export function ICTab({ intel }: { intel: DealIntelligence }) {
  const ic = intel.ic;
  const walk = intel.scoreChanges.filter((c) => c.key === "investmentConviction");

  if (!ic) {
    return (
      <div>
        <Section title="Decision">
          <Note>
            {intel.stage === "source" || intel.stage === "triage"
              ? "Too early for a packet."
              : "No IC packet on this deal. Open Helio Freight for the full example."}
          </Note>
        </Section>
        {walk.length ? <ConvictionWalk walk={walk} /> : null}
      </div>
    );
  }

  return (
    <div>
      <Section title="Recommendation">
        <p className="font-serif text-[1.75rem] leading-snug">{recommendationLabel(ic.recommendation)}</p>
        <div className="mt-3">
          <Note>{ic.executiveSummary}</Note>
        </div>
      </Section>

      <Section title="Bull / bear">
        <p className="text-[16px] leading-7">
          <span className="text-ledger">Bull. </span>
          {ic.bullCase}
        </p>
        <p className="mt-4 text-[16px] leading-7">
          <span className="text-flag-amber">Bear. </span>
          {ic.bearCase}
        </p>
      </Section>

      {intel.returns ? (
        <Section title="Returns" lead={intel.returns.caveat}>
          <p>
            Base {intel.returns.scenarios.find((s) => s.name === "base")?.moic ?? "—"}x · bear{" "}
            {intel.returns.scenarios.find((s) => s.name === "bear")?.moic ?? "—"}x · bull{" "}
            {intel.returns.scenarios.find((s) => s.name === "bull")?.moic ?? "—"}x
          </p>
        </Section>
      ) : null}

      {intel.valuation ? (
        <Section title="Price">
          <p>{intel.valuation.entryValuation}</p>
          <p className="mt-2 text-mute">{intel.valuation.companyQualityVsPrice}</p>
        </Section>
      ) : null}

      <ConvictionWalk walk={walk} />
    </div>
  );
}

function ConvictionWalk({
  walk,
}: {
  walk: DealIntelligence["scoreChanges"];
}) {
  if (!walk.length) return null;
  const last = walk[walk.length - 1];
  return (
    <Section title="What changed my mind">
      <p className="font-serif text-[1.75rem] leading-none">{scoreDisplay(last.next)}</p>
      <ul className="mt-5 space-y-3">
        {walk.map((change) => {
          const delta =
            change.previous != null && change.next != null ? change.next - change.previous : null;
          return (
            <li key={change.id} className="text-[16px] leading-7">
              {change.reason}
              {delta != null && delta !== 0 ? (
                <span className={delta > 0 ? "text-ledger" : "text-flag-red"}>
                  {" "}
                  {delta > 0 ? `+${delta}` : delta}
                </span>
              ) : null}
            </li>
          );
        })}
      </ul>
    </Section>
  );
}
