"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { readJson } from "@/lib/http";
import type { AskCitation } from "@/lib/diligence/types";

type Turn = {
  id: string;
  question: string;
  answer?: string;
  citations: AskCitation[];
  related: string[];
  model?: string;
  error?: string;
  pending?: boolean;
};

type Props = {
  dealId: string;
  company?: string;
  suggestions?: string[];
  compact?: boolean;
};

const FALLBACK_ASKS = [
  "What's their real ARR?",
  "Why does runway disagree?",
  "Who owns the company?",
];

export function AskTab({ dealId, company, suggestions, compact = false }: Props) {
  const chips = (suggestions?.length ? suggestions : FALLBACK_ASKS).slice(0, 4);
  const [input, setInput] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [ready, setReady] = useState(false);
  const bottom = useRef<HTMLDivElement>(null);
  const field = useRef<HTMLTextAreaElement>(null);
  const storeKey = `nd-ask-${dealId}`;

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(storeKey);
      if (raw) {
        const parsed = JSON.parse(raw) as Turn[];
        if (Array.isArray(parsed)) setTurns(parsed.filter((t) => t.question && !t.pending));
      }
    } catch {
      /* empty thread */
    }
    setReady(true);
  }, [storeKey]);

  useEffect(() => {
    if (!ready) return;
    sessionStorage.setItem(storeKey, JSON.stringify(turns.filter((t) => !t.pending)));
  }, [ready, storeKey, turns]);

  useEffect(() => {
    bottom.current?.scrollIntoView({ block: "end", behavior: "smooth" });
  }, [turns]);

  async function ask(question: string) {
    const q = question.trim();
    if (!q || turns.some((t) => t.pending)) return;
    setInput("");
    const id = `${Date.now()}`;
    const pending: Turn = { id, question: q, citations: [], related: [], pending: true };
    setTurns((prev) => [...prev, pending]);
    const history = turns
      .filter((t) => t.answer)
      .flatMap((t) => [
        { role: "user" as const, content: t.question },
        { role: "assistant" as const, content: t.answer ?? "" },
      ]);
    const res = await fetch(`/api/deals/${dealId}/query`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question: q, history }),
    });
    const data = await readJson(res);
    setTurns((prev) =>
      prev.map((t) =>
        t.id !== id
          ? t
          : {
              ...t,
              pending: false,
              answer: typeof data.answer === "string" ? data.answer : "",
              citations: parseCitations(data.citations),
              related: Array.isArray(data.related) ? data.related.map(String).slice(0, 3) : [],
              model: typeof data.model === "string" ? data.model : "Muse Glimmer",
              error:
                res.ok || typeof data.answer === "string"
                  ? undefined
                  : typeof data.error === "string"
                    ? data.error
                    : "Could not reach Muse Glimmer.",
            },
      ),
    );
  }

  function submit(event?: React.FormEvent) {
    event?.preventDefault();
    void ask(input);
  }

  const empty = turns.length === 0;

  return (
    <div className={`ask-page ${compact ? "is-compact" : ""} ${empty ? "is-empty" : ""}`}>
      {empty ? (
        <div className="ask-hero">
          <p className="ask-kicker">Muse Glimmer · this deal only</p>
          <h2 className="ask-title">What would you like to know?</h2>
          <p className="ask-lead">
            {company ? `Ask about ${company}.` : "Ask about this room."} Answers come from the
            files, with citations.
          </p>
        </div>
      ) : (
        <div className="ask-toolbar">
          <p className="ask-kicker">Muse Glimmer · this deal only</p>
          <button type="button" className="ask-new" onClick={() => setTurns([])}>
            New question
          </button>
        </div>
      )}

      <div className="ask-thread">
        {turns.map((turn) => (
          <article key={turn.id} className="ask-turn">
            <h3 className="ask-q">{turn.question}</h3>
            {turn.pending ? <AskSkeleton /> : null}
            {turn.error ? <p className="ask-error">{turn.error}</p> : null}
            {!turn.pending && turn.citations.length ? (
              <Sources dealId={dealId} citations={turn.citations} />
            ) : null}
            {turn.answer ? (
              <div className="ask-answer">
                <p className="ask-section-label">Answer</p>
                <CitedText text={turn.answer} citations={turn.citations} dealId={dealId} />
                {turn.model ? <p className="ask-model">{turn.model}</p> : null}
              </div>
            ) : null}
            {!turn.pending && turn.related.length ? (
              <div className="ask-related">
                <p className="ask-section-label">Related</p>
                {turn.related.map((item) => (
                  <button key={item} type="button" onClick={() => void ask(item)}>
                    {item}
                  </button>
                ))}
              </div>
            ) : null}
          </article>
        ))}
        <div ref={bottom} />
      </div>

      {empty ? (
        <div className="ask-chips">
          {chips.map((chip) => (
            <button key={chip} type="button" onClick={() => void ask(chip)}>
              {chip}
            </button>
          ))}
        </div>
      ) : null}

      <form className="ask-composer" onSubmit={submit}>
        <div className="ask-composer-box">
          <label className="sr-only" htmlFor={`ask-field-${dealId}`}>
            Ask this deal
          </label>
          <textarea
            id={`ask-field-${dealId}`}
            ref={field}
            rows={1}
            value={input}
            placeholder={turns.length ? "Ask a follow-up…" : "Ask anything about this room…"}
            disabled={turns.some((t) => t.pending)}
            onChange={(event) => {
              setInput(event.target.value);
              event.target.style.height = "auto";
              event.target.style.height = `${Math.min(event.target.scrollHeight, 140)}px`;
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
                event.preventDefault();
                submit();
              }
            }}
          />
          <button type="submit" className="ask-send" disabled={!input.trim() || turns.some((t) => t.pending)} aria-label="Ask">
            <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
              <path fill="currentColor" d="M11 19V7.8l-4.6 4.6L5 11l7-7 7 7-1.4 1.4L13 7.8V19z" />
            </svg>
          </button>
        </div>
      </form>
    </div>
  );
}

function Sources({ dealId, citations }: { dealId: string; citations: AskCitation[] }) {
  return (
    <div className="ask-sources">
      <p className="ask-section-label">Sources</p>
      <div className="ask-source-row">
        {citations.map((cite) => (
          <Link
            key={`${cite.n}-${cite.filename}-${cite.page ?? ""}-${cite.sheet ?? ""}`}
            href={fileHref(dealId, cite.filename)}
            className="ask-source"
            id={`ask-src-${cite.n}`}
          >
            <span className="ask-source-n">{cite.n}</span>
            <span>
              <strong>{cite.filename}</strong>
              <em>{[cite.sheet, cite.page ? `p.${cite.page}` : ""].filter(Boolean).join(" · ") || "data room"}</em>
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}

function CitedText({
  text,
  citations,
  dealId,
}: {
  text: string;
  citations: AskCitation[];
  dealId: string;
}) {
  const parts = text.split(/(\[\d+\])/g);
  return (
    <p>
      {parts.map((part, i) => {
        const hit = part.match(/^\[(\d+)\]$/);
        if (!hit) return <span key={i}>{part}</span>;
        const n = Number(hit[1]);
        const cite = citations.find((c) => c.n === n);
        if (!cite) return <span key={i}>{part}</span>;
        return (
          <Link key={i} href={fileHref(dealId, cite.filename)} className="ask-cite" title={cite.label}>
            {n}
          </Link>
        );
      })}
    </p>
  );
}

function AskSkeleton() {
  const id = useId();
  return (
    <div className="ask-skel" aria-live="polite" aria-busy="true">
      <p className="ask-section-label">Reading the room…</p>
      <div className="ask-source-row">
        {[0, 1, 2].map((i) => (
          <div key={`${id}-${i}`} className="ask-source is-skel" />
        ))}
      </div>
      <div className="ask-skel-line" />
      <div className="ask-skel-line is-short" />
    </div>
  );
}

function parseCitations(raw: unknown): AskCitation[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item, i) => {
      if (!item || typeof item !== "object") return null;
      const row = item as Record<string, unknown>;
      if (typeof row.filename !== "string") return null;
      return {
        n: typeof row.n === "number" ? row.n : i + 1,
        filename: row.filename,
        page: typeof row.page === "number" ? row.page : undefined,
        sheet: typeof row.sheet === "string" ? row.sheet : undefined,
        quote: typeof row.quote === "string" ? row.quote : undefined,
        label: typeof row.label === "string" ? row.label : row.filename,
      };
    })
    .filter((item): item is AskCitation => Boolean(item));
}

function fileHref(dealId: string, filename: string): string {
  if (/\.pdf$/i.test(filename) && /deck/i.test(filename)) {
    return `/deals/${dealId}/deck?name=${encodeURIComponent(filename)}`;
  }
  return `/deals/${dealId}/preview?name=${encodeURIComponent(filename)}`;
}
