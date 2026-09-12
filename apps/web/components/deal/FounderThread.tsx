"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { Flag } from "@/lib/diligence/types";
import type { DealIntelligence } from "@/lib/intelligence/types";
import { founderDraft, responseMap } from "@/lib/intelligence/viewStory";

type Props = {
  dealId: string;
  intel: DealIntelligence;
  flags: Flag[];
};

export function FounderThread({ dealId, intel, flags }: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [draft, setDraft] = useState(() => founderDraft(flags));
  const [editing, setEditing] = useState(false);
  const canSend = dealId === "northstar-robotics" || dealId === "northstar-live";
  const map = responseMap(intel, flags);
  const question = intel.questions.find((item) => item.status === "open" || item.status === "asked");

  if (!flags.length && !question) return null;

  return (
    <section className="desk-card">
      <h2 className="font-serif text-[1.6rem] leading-tight">Founder request</h2>
      <p className="mt-2 max-w-[38rem] text-[1rem] leading-7 text-mute">
        A finding is what we saw. A question is what we still need answered. The note below is the
        message — it does not send itself.
      </p>
      <ol className="founder-flow">
        <li>
          <p>Finding</p>
          <p>{flags[0]?.comment ?? intel.findings.find((item) => item.kind === "contradiction")?.title}</p>
        </li>
        <li>
          <p>Question</p>
          <p>{question?.question ?? "Why do the deck and the data room disagree?"}</p>
        </li>
        <li>
          <p>Founder message</p>
          {editing ? (
            <textarea className="founder-draft" value={draft} onChange={(e) => setDraft(e.target.value)} rows={8} />
          ) : (
            <pre className="founder-draft">{draft}</pre>
          )}
          <div className="founder-actions">
            <button type="button" onClick={() => setEditing((v) => !v)}>
              {editing ? "Done editing" : "Edit"}
            </button>
            <button
              type="button"
              disabled={pending || intel.founderReplyApplied || !canSend}
              onClick={() => {
                start(async () => {
                  await fetch(`/api/deals/${dealId}/founder-reply`, { method: "POST" });
                  router.refresh();
                });
              }}
            >
              {intel.founderReplyApplied ? "Reply received" : pending ? "Sending…" : "Send to founder"}
            </button>
          </div>
        </li>
        {intel.founderReplyApplied ? (
          <li>
            <p>Founder response</p>
            <ul>
              {map.map((row) => (
                <li key={row.id}>
                  {row.metric}
                  <span>{row.status}</span>
                </li>
              ))}
            </ul>
          </li>
        ) : null}
      </ol>
    </section>
  );
}
