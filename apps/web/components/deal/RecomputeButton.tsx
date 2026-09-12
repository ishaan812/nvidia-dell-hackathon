"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { readJson } from "@/lib/http";

export function RecomputeButton({ dealId }: { dealId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function run() {
    setError(null);
    setNote("Reading the room, then LinkedIn and market. The model writes the memo after the sources.");
    start(async () => {
      const res = await fetch(`/api/deals/${dealId}/recompute-desk`, { method: "POST" });
      const data = await readJson(res);
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Could not recompute this deal.");
        setNote(null);
        return;
      }
      setNote("Updated financials, founder reads, and market memo.");
      router.refresh();
    });
  }

  return (
    <div className="recompute-bar">
      <button type="button" className="desk-btn" disabled={pending} onClick={run}>
        {pending ? "Recomputing…" : "Recompute diligence"}
      </button>
      {note ? <p>{note}</p> : null}
      {error ? <p className="is-bad">{error}</p> : null}
    </div>
  );
}
