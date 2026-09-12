"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import type { DealIntelligence } from "@/lib/intelligence/types";
import { Note, Section } from "./ui";

type Props = { dealId: string; intel: DealIntelligence };

export function QuestionsTab({ dealId, intel }: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const canReply = dealId === "northstar-robotics" && !intel.founderReplyApplied;

  return (
    <Section
      title="Founder loop"
      lead="Questions come from unresolved findings. A reply re-runs the relevant scores."
    >
      {intel.questions.length === 0 ? (
        <Note>No questions yet.</Note>
      ) : (
        <ul className="divide-y divide-white/10">
          {intel.questions.map((q) => (
            <li key={q.id} className="py-5">
              <p className="kind-pill">{q.status}</p>
              <p className="mt-2 font-serif text-xl">{q.question}</p>
              <p className="mt-2 text-[15px] text-paper/75">{q.reason}</p>
              <p className="mt-2 font-mono text-[11px] text-paper/50">
                Evidence required: {q.evidenceRequired} · {q.owner}
                {q.deadline ? ` · ${q.deadline}` : ""}
              </p>
            </li>
          ))}
        </ul>
      )}
      {canReply ? (
        <button
          type="button"
          disabled={pending}
          className="mt-6 bg-paper px-4 py-3 text-[14px] text-ink disabled:opacity-50"
          onClick={() =>
            start(async () => {
              await fetch(`/api/deals/${dealId}/founder-reply`, { method: "POST" });
              router.refresh();
            })
          }
        >
          {pending ? "Applying reply…" : "Apply founder ARR reply"}
        </button>
      ) : null}
      {intel.founderReplyApplied ? (
        <p className="mt-4 text-[14px] text-ledger">Founder reply applied. Conviction and next action updated.</p>
      ) : null}
    </Section>
  );
}
