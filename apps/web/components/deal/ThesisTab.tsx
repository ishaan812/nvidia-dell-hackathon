import type { DealIntelligence } from "@/lib/intelligence/types";
import { thesisBrief, thesisChecks } from "@/lib/intelligence/viewStory";
import { ScoreValue } from "./ScoreValue";
import { Note, Section } from "./ui";

export function ThesisTab({ intel }: { intel: DealIntelligence }) {
  const score = intel.thesis.score;
  const checks = thesisChecks(intel);
  return (
    <div>
      <Section title="Thesis fit">
        <p className="font-serif text-[2.1rem] leading-none">
          <ScoreValue value={score} />
        </p>
        <p className="mt-4 max-w-[38rem] text-[1.05rem] leading-7">{thesisBrief(intel)}</p>
      </Section>
      <Section title="Shared with the thesis">
        {checks.length ? (
          <ul className="thesis-checks">
            {checks.map((item) => (
              <li key={item.label}>
                <label>
                  <input type="checkbox" checked={item.on} readOnly />
                  <span>
                    <strong>{item.label}</strong>
                    {item.detail}
                  </span>
                </label>
              </li>
            ))}
          </ul>
        ) : (
          <Note>Scoring starts after triage.</Note>
        )}
      </Section>
    </div>
  );
}
