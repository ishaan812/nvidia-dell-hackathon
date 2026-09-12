import type { Deal } from "@/lib/diligence/types";
import type { DealIntelligence } from "@/lib/intelligence/types";
import { plainMetric } from "@/lib/intelligence/viewStory";
import { Note, Section } from "./ui";

type Props = { deal: Deal; intel: DealIntelligence };

export function NumbersTab({ intel }: Props) {
  const rows = intel.claims.filter((c) => c.managementValue || c.recomputedValue);

  return (
    <Section title="Stated vs the files" lead="What management said, then what the files support.">
      {rows.length === 0 ? (
        <Note>No numbers yet. HarborMail is still just a profile.</Note>
      ) : (
        <table className="pipe-table">
          <thead>
            <tr>
              <th>Claim</th>
              <th>They said</th>
              <th>We get</th>
              <th>Kind</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((claim) => (
              <tr key={claim.id}>
                <td>{plainMetric(claim.metric) || claim.text}</td>
                <td>{claim.managementValue ?? "—"}</td>
                <td>{claim.recomputedValue ?? "—"}</td>
                <td>{claim.kind === "management" ? "Management assumption" : claim.kind === "fact" ? "Fact" : claim.kind}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Section>
  );
}
