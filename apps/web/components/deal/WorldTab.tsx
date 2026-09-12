import type { DealIntelligence } from "@/lib/intelligence/types";
import { Note, Section } from "./ui";

export function WorldTab({ intel }: { intel: DealIntelligence }) {
  return (
    <Section title="Independent checks">
      {intel.world.length === 0 ? (
        <Note>No external tests yet.</Note>
      ) : (
        <ul className="divide-y divide-white/10">
          {intel.world.map((row) => (
            <li key={row.claim} className="py-5">
              <p className="font-serif text-xl">{row.claim}</p>
              <dl className="mt-3 grid gap-2 text-[14px] leading-6 md:grid-cols-2">
                <div>
                  <dt className="kind-pill">Independent</dt>
                  <dd className="mt-1 text-paper/75">{row.independent}</dd>
                </div>
                <div>
                  <dt className="kind-pill">Against</dt>
                  <dd className="mt-1 text-paper/75">{row.against}</dd>
                </div>
                <div>
                  <dt className="kind-pill">Missing</dt>
                  <dd className="mt-1 text-paper/75">{row.missing}</dd>
                </div>
                <div>
                  <dt className="kind-pill">Assessment · {row.confidence}</dt>
                  <dd className="mt-1 text-paper/75">{row.assessment}</dd>
                </div>
              </dl>
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}
