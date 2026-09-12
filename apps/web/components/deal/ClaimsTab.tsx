import { kindLabel } from "@/lib/format";
import type { DealIntelligence } from "@/lib/intelligence/types";
import { Note, Section } from "./ui";

export function ClaimsTab({ intel }: { intel: DealIntelligence }) {
  return (
    <Section
      title="Claims"
      lead="A pitch deck is management-provided, never primary evidence."
    >
      {intel.claims.length === 0 ? (
        <Note>No claims extracted yet. SOURCE deals start as a profile only.</Note>
      ) : (
        <ul className="divide-y divide-white/10">
          {intel.claims.map((claim) => (
            <li key={claim.id} className="py-5">
              <p className="font-serif text-xl">{claim.text}</p>
              <p className="mt-2 font-mono text-[11px] text-paper/50">
                {kindLabel(claim.kind)} · {kindLabel(claim.sourceType)} · {claim.verification} ·
                confidence {claim.confidence}
                {claim.sourceDocument ? ` · ${claim.sourceDocument}` : ""}
                {claim.page ? ` p.${claim.page}` : ""}
              </p>
              {claim.assessment ? <p className="mt-2 text-[15px] text-paper/75">{claim.assessment}</p> : null}
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}
