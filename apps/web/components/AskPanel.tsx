"use client";

import { useState, useTransition } from "react";
import { readJson } from "@/lib/http";

type Props = {
  dealId: string;
  compact?: boolean;
};

export function AskPanel({ dealId, compact = false }: Props) {
  const [question, setQuestion] = useState("What's their real burn?");
  const [answer, setAnswer] = useState<string | null>(null);
  const [sources, setSources] = useState<string[]>([]);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function ask() {
    setError(null);
    startTransition(async () => {
      const res = await fetch(`/api/deals/${dealId}/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });
      const data = await readJson(res);
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Could not ask the room");
        return;
      }
      setAnswer(typeof data.answer === "string" ? data.answer : "");
      setSources(Array.isArray(data.sources) ? data.sources.map(String) : []);
    });
  }

  return (
    <div className={compact ? "px-6 py-6" : "mx-auto max-w-xl px-8 py-10"}>
      <h2 className={`font-serif text-ink ${compact ? "text-[26px]" : "text-3xl"}`}>Ask this room</h2>
      <p className="mt-3 text-[15px] leading-7 text-ink/60">
        Questions stay inside this deal. Metric questions read the table first.
      </p>
      <label htmlFor={`ask-${dealId}`} className="mt-6 block text-[14px] text-ink/70">
        Your question
      </label>
      <textarea
        id={`ask-${dealId}`}
        value={question}
        onChange={(event) => setQuestion(event.target.value)}
        className="mt-2 h-28 w-full border border-black/12 bg-white/50 p-3 text-[15px] leading-6 outline-none focus:border-copper"
      />
      <button
        type="button"
        onClick={ask}
        disabled={pending || !question.trim()}
        className="mt-4 bg-ink px-4 py-2.5 text-[14px] text-paper disabled:opacity-50"
      >
        {pending ? "Looking…" : "Ask"}
      </button>
      {error ? <p className="mt-4 text-[14px] text-flag-red">{error}</p> : null}
      {answer ? (
        <div className="mt-8 font-serif text-[17px] leading-8 text-ink">
          {answer}
          {sources.length > 0 ? (
            <p className="mt-4 font-mono text-[11px] text-ink/40">from {sources.join(" · ")}</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
