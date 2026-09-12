import type { DealIntelligence } from "@/lib/intelligence/types";
import { Note, Section } from "./ui";

export function ValuationTab({ intel }: { intel: DealIntelligence }) {
  const v = intel.valuation;
  const r = intel.returns;
  return (
    <div>
      <Section
        title="Valuation"
        lead="Company quality is not the same as attractiveness at this price."
      >
        {!v ? (
          <Note>No valuation view yet.</Note>
        ) : (
          <dl className="grid gap-4 md:grid-cols-2">
            {(
              [
                ["Entry", v.entryValuation],
                ["Revenue multiple", v.revenueMultiple],
                ["Comps", v.comps],
                ["Growth-adjusted", v.growthAdjusted],
                ["Ownership", v.ownership],
                ["Dilution", v.dilution],
                ["Future financing", v.futureFinancing],
                ["Exit", v.exitValuation],
                ["Potential returns", v.potentialReturns],
              ] as const
            ).map(([label, value]) =>
              value ? (
                <div key={label}>
                  <dt className="kind-pill">{label}</dt>
                  <dd className="mt-1 text-[15px] text-paper/80">{value}</dd>
                </div>
              ) : null,
            )}
            <div className="md:col-span-2">
              <dt className="kind-pill">Quality vs price</dt>
              <dd className="mt-1 text-[15px] text-paper/80">{v.companyQualityVsPrice}</dd>
            </div>
          </dl>
        )}
      </Section>

      <Section
        title="Return scenarios"
        lead={r?.caveat ?? "Assumptions must stay visible. These are not calibrated frequencies."}
      >
        {!r ? (
          <Note>Scenarios appear once a deal reaches IC-level work.</Note>
        ) : (
          <div className="overflow-x-auto">
            <table className="pipe-table">
              <thead>
                <tr>
                  <th>Case</th>
                  <th>MOIC</th>
                  <th>IRR</th>
                  <th>Narrative</th>
                  <th>Assumptions</th>
                </tr>
              </thead>
              <tbody>
                {r.scenarios.map((s) => (
                  <tr key={s.name}>
                    <td className="capitalize">{s.name}</td>
                    <td>{s.moic ?? "—"}x</td>
                    <td>{s.irr != null ? `${Math.round(s.irr * 100)}%` : "—"}</td>
                    <td className="max-w-[20rem]">{s.narrative}</td>
                    <td className="max-w-[16rem] text-paper/65">{s.assumptions.join("; ")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-4 font-mono text-[12px] text-paper/50">
              Expected MOIC {r.expectedMoic ?? "—"} · IRR{" "}
              {r.expectedIrr != null ? `${Math.round(r.expectedIrr * 100)}%` : "—"} · P(loss){" "}
              {r.pLoss != null ? Math.round(r.pLoss * 100) : "—"}% · P(3x+){" "}
              {r.p3x != null ? Math.round(r.p3x * 100) : "—"}% · P(10x+){" "}
              {r.p10x != null ? Math.round(r.p10x * 100) : "—"}%
            </p>
          </div>
        )}
      </Section>

      <Section title="Assumptions">
        {intel.assumptions.length === 0 ? (
          <Note>No named assumptions.</Note>
        ) : (
          <ul className="space-y-2">
            {intel.assumptions.map((a) => (
              <li key={a.id} className="text-[15px]">
                <span className="kind-pill">{a.source}</span> {a.text}{" "}
                <span className="text-paper/50">({a.usedIn})</span>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}
