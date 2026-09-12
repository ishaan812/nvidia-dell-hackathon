"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { readJson } from "@/lib/http";
import { courtCopy, verbsFor } from "@/lib/intelligence/verbs";
import type { DealIntelligence } from "@/lib/intelligence/types";

export function DealVerbs({ dealId, intel }: { dealId: string; intel: DealIntelligence }) {
  const router = useRouter();
  const verbs = verbsFor(intel);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  if (!verbs.length) return null;

  function act(gate: string, choice: string) {
    setError(null);
    setBusy(choice);
    start(async () => {
      const res = await fetch(`/api/deals/${dealId}/decide`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gate, choice }),
      });
      const data = await readJson(res);
      setBusy(null);
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Could not take that action.");
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="deal-verbs">
      <p className="deal-court">{courtCopy(intel)}</p>
      <div className="deal-verbs-row">
        {verbs.map((verb) => (
          <button
            key={`${verb.gate}-${verb.choice}`}
            type="button"
            className={verb.primary ? "desk-btn" : "desk-btn-quiet"}
            disabled={pending}
            onClick={() => act(verb.gate, verb.choice)}
          >
            {pending && busy === verb.choice ? "Working…" : verb.label}
          </button>
        ))}
      </div>
      {error ? <p className="deal-verbs-error">{error}</p> : null}
    </div>
  );
}
