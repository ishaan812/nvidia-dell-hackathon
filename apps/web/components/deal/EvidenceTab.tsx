import { kindLabel } from "@/lib/format";
import type { DealIntelligence } from "@/lib/intelligence/types";
import { Note, Section } from "./ui";

export function EvidenceTab({ intel }: { intel: DealIntelligence }) {
  return (
    <Section title="Evidence" lead="Primary, secondary, management-provided, or unverified.">
      {intel.evidence.length === 0 ? (
        <Note>No evidence objects yet.</Note>
      ) : (
        <ul className="divide-y divide-white/10">
          {intel.evidence.map((item) => (
            <li key={item.id} className="py-5">
              <p className="text-[16px]">{item.text}</p>
              <p className="mt-2 font-mono text-[11px] text-paper/50">
                {item.forOrAgainst} · {kindLabel(item.sourceType)}
                {item.sourceDocument ? ` · ${item.sourceDocument}` : ""}
                {item.location ? ` · ${item.location}` : ""}
              </p>
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}
