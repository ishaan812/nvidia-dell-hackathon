"use client";

import { useState, useTransition } from "react";
import { readJson } from "@/lib/http";
import type { DealIntelligence, FounderResearch, FounderSpike, ResearchHit } from "@/lib/intelligence/types";
import { Note, Section } from "./ui";

export function FounderPane({ dealId, intel }: { dealId: string; intel: DealIntelligence }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [people, setPeople] = useState<FounderResearch[] | null>(asPeople(intel.research?.founders));

  function search() {
    setError(null);
    start(async () => {
      const res = await fetch(`/api/deals/${dealId}/research/founder`, { method: "POST" });
      const data = await readJson(res);
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Could not search founders.");
        return;
      }
      setPeople(asPeople(data.people));
    });
  }

  return (
    <div>
      <Section title="Founder diligence">
        <Note>
          Public history on each named founder — the spike, then the sources. Unusual backgrounds stay in
          evaluation.
        </Note>
        <button type="button" className="desk-btn mt-5" disabled={pending} onClick={search}>
          {pending ? "Reading public history…" : people?.length ? "Refresh founder research" : "Search LinkedIn and public history"}
        </button>
        {error ? <p className="mt-3 text-flag-red">{error}</p> : null}
      </Section>

      {people?.map((person) => (
        <Section key={person.name} title={person.name}>
          <p className="founder-summary">{person.summary}</p>
          {person.spikes.length ? (
            <div className="founder-spikes">
              <h3>Spikes of excellence</h3>
              <ul>
                {person.spikes.map((spike) => (
                  <li key={spike.title}>
                    <strong>{spike.title}</strong>
                    {spike.detail}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {person.hits.length ? (
            <div className="founder-cites">
              <h3>Sources</h3>
              <ol>
                {person.hits.map((hit, index) => (
                  <li key={hit.url}>
                    <a href={hit.url} target="_blank" rel="noreferrer">
                      [{index + 1}] {citeLabel(hit)}
                    </a>
                  </li>
                ))}
              </ol>
            </div>
          ) : null}
        </Section>
      ))}
    </div>
  );
}

function asPeople(raw: unknown): FounderResearch[] | null {
  if (!Array.isArray(raw) || !raw.length) return null;
  const people = raw
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const row = item as Record<string, unknown>;
      if (typeof row.name !== "string") return null;
      return {
        name: row.name,
        summary: typeof row.summary === "string" ? row.summary : "",
        spikes: asSpikes(row.spikes),
        hits: asHits(row.hits),
      };
    })
    .filter((item): item is FounderResearch => Boolean(item));
  return people.length ? people : null;
}

function asSpikes(raw: unknown): FounderSpike[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (typeof item === "string" && item.trim()) return { title: "Note", detail: item.trim() };
      if (!item || typeof item !== "object") return null;
      const row = item as Record<string, unknown>;
      if (typeof row.title !== "string" || typeof row.detail !== "string") return null;
      return { title: row.title, detail: row.detail };
    })
    .filter((item): item is FounderSpike => Boolean(item));
}

function asHits(raw: unknown): ResearchHit[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const row = item as Record<string, unknown>;
      if (typeof row.url !== "string") return null;
      return {
        title: typeof row.title === "string" ? row.title : row.url,
        url: row.url,
        description: typeof row.description === "string" ? row.description : "",
      };
    })
    .filter((item): item is ResearchHit => Boolean(item));
}

function citeLabel(hit: ResearchHit): string {
  return hit.title.replace(/\s*[|–-]\s*LinkedIn\s*$/i, "").trim() || hit.url;
}
