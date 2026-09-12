import type { DealIntelligence } from "@/lib/intelligence/types";
import { Note, Section } from "./ui";

export function FindingsTab({ intel }: { intel: DealIntelligence }) {
  return (
    <Section title="Findings" lead="Strengths, gaps, contradictions, and thesis exceptions — not decisions.">
      {intel.findings.length === 0 ? (
        <Note>No findings yet.</Note>
      ) : (
        <ul className="divide-y divide-white/10">
          {intel.findings.map((item) => (
            <li key={item.id} className="py-5">
              <p className="kind-pill">{item.kind.replace("_", " ")}</p>
              <p className="mt-2 font-serif text-xl">{item.title}</p>
              <p className="mt-2 text-[15px] leading-6 text-paper/75">{item.body}</p>
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}
