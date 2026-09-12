import type { DealIntelligence } from "@/lib/intelligence/types";
import { Note, Section } from "./ui";

export function RisksTab({ intel }: { intel: DealIntelligence }) {
  const clusters = new Map<string, typeof intel.risks>();
  for (const risk of intel.risks) {
    const key = risk.cluster ?? risk.id;
    const list = clusters.get(key) ?? [];
    list.push(risk);
    clusters.set(key, list);
  }

  return (
    <Section
      title="Risk"
      lead="Risk is separate from opportunity quality. Correlated symptoms are clustered so they are not double-counted."
    >
      {intel.risks.length === 0 ? (
        <Note>No risks scored yet.</Note>
      ) : (
        <div className="space-y-8">
          {[...clusters.entries()].map(([cluster, risks]) => (
            <div key={cluster}>
              {risks.length > 1 ? (
                <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-copper">
                  Cluster · {cluster}
                </p>
              ) : null}
              <ul className="divide-y divide-white/10">
                {risks.map((risk) => (
                  <li key={risk.id} className="py-4">
                    <p className="kind-pill">
                      {risk.category} · {risk.status}
                    </p>
                    <p className="mt-2 text-[16px]">{risk.description}</p>
                    <p className="mt-2 font-mono text-[11px] text-paper/50">
                      p {risk.probability} · impact {risk.impact} · materiality {risk.materiality} ·
                      evidence {risk.evidenceConfidence} · {risk.persistence} · {risk.timeHorizon}
                      {risk.owner ? ` · ${risk.owner}` : ""}
                    </p>
                    {risk.mitigation ? (
                      <p className="mt-2 text-[14px] text-paper/70">Mitigation: {risk.mitigation}</p>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </Section>
  );
}
