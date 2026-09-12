"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import type { Deal } from "@/lib/diligence/types";
import type { DealIntelligence } from "@/lib/intelligence/types";
import { Note, Section } from "./ui";

type Props = { deal: Deal; intel: DealIntelligence };

export function NumbersTab({ deal, intel }: Props) {
  const rows = intel.claims.filter((c) => c.managementValue || c.recomputedValue);
  const flags = deal.flags;
  const question = intel.questions[0];

  return (
    <div>
      <Section
        title="Stated vs room"
        lead="Management number, then what the files actually say."
      >
        {rows.length === 0 && flags.length === 0 ? (
          <Note>No numbers yet. HarborMail is still just a profile.</Note>
        ) : (
          <table className="pipe-table">
            <thead>
              <tr>
                <th>Claim</th>
                <th>They said</th>
                <th>We get</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((claim) => (
                <tr key={claim.id}>
                  <td>{claim.metric ?? claim.text}</td>
                  <td>{claim.managementValue ?? "—"}</td>
                  <td>{claim.recomputedValue ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>

      {flags.length ? (
        <Section title="Flags">
          <ul className="space-y-4">
            {flags.map((flag) => (
              <li key={flag.id}>
                <p>{flag.comment}</p>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      {question ? (
        <Section title="Open question">
          <p className="text-[17px] leading-7">{question.question}</p>
          {deal.id === "northstar-robotics" ? <FounderReply dealId={deal.id} applied={Boolean(intel.founderReplyApplied)} /> : null}
        </Section>
      ) : null}
    </div>
  );
}

function FounderReply({ dealId, applied }: { dealId: string; applied: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  if (applied) return <p className="mt-4 text-ledger">Reply applied. Conviction moved.</p>;
  return (
    <button
      type="button"
      disabled={pending}
      className="mt-5 bg-paper px-4 py-3 text-[15px] text-ink disabled:opacity-50"
      onClick={() =>
        start(async () => {
          await fetch(`/api/deals/${dealId}/founder-reply`, { method: "POST" });
          router.refresh();
        })
      }
    >
      {pending ? "Applying…" : "Apply founder ARR reply"}
    </button>
  );
}
