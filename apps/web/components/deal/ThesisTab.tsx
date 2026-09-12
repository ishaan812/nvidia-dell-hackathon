import type { DealIntelligence } from "@/lib/intelligence/types";
import { Note, Section } from "./ui";

export function ThesisTab({ intel }: { intel: DealIntelligence }) {
  const t = intel.thesis;
  return (
    <div>
      <Section title="Thesis fit" lead="A miss is a warning. It never auto-rejects.">
        <p className="font-serif text-[2.5rem] leading-none">{t.score ?? "—"}</p>
        <div className="mt-4">
          <Note>{t.whyItMayStillMatter}</Note>
        </div>
      </Section>

      {t.exceptions.length ? (
        <Section title="Exception">
          {t.exceptions.map((item) => (
            <div key={item.label}>
              <p className="font-medium text-flag-amber">{item.label}</p>
              <p className="mt-2 text-[16px] leading-7 text-mute">{item.detail}</p>
            </div>
          ))}
        </Section>
      ) : null}

      <Section title="What fits">
        {t.matches.length ? (
          <ul className="space-y-2 text-[16px] leading-7">
            {t.matches.map((item) => (
              <li key={item.label}>{item.detail}</li>
            ))}
          </ul>
        ) : (
          <Note>Scoring starts after triage.</Note>
        )}
      </Section>

      {t.mismatches.length ? (
        <Section title="What does not">
          <ul className="space-y-2 text-[16px] leading-7 text-mute">
            {t.mismatches.map((item) => (
              <li key={item.label}>{item.detail}</li>
            ))}
          </ul>
        </Section>
      ) : null}
    </div>
  );
}
