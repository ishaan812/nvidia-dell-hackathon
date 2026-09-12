"use client";

import { useState, useTransition } from "react";
import { readJson } from "@/lib/http";
import type { DealIntelligence, MarketInsight, MarketResearch, ResearchHit } from "@/lib/intelligence/types";
import { Note, Section } from "./ui";

export function MarketPane({ dealId, intel }: { dealId: string; intel: DealIntelligence }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [pack, setPack] = useState<MarketResearch | null>(asMarket(intel.research?.market));
  const tamClaim = intel.claims.find((item) => item.metric === "tam");
  const deckTam = tamClaim?.managementValue || pack?.deckTam;
  const cites = uniqueHits([...(pack?.tam ?? []), ...(pack?.space ?? []), ...(pack?.competitors ?? [])]).slice(0, 6);

  function search() {
    setError(null);
    start(async () => {
      const res = await fetch(`/api/deals/${dealId}/research/market`, { method: "POST" });
      const data = await readJson(res);
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Could not search the market.");
        return;
      }
      setPack(asMarket(data));
    });
  }

  return (
    <div>
      <Section title="Market">
        {deckTam ? <p className="market-deck">Deck says {deckTam}</p> : null}
        {tamClaim?.recomputedValue ? <p className="mt-2 text-mute">From the files: {tamClaim.recomputedValue}.</p> : null}
        {pack?.summary ? <p className="founder-summary mt-4">{pack.summary}</p> : (
          <Note>Search lands sources first. The model writes TAM, open space, and competitors only after that pass.</Note>
        )}
        <button type="button" className="desk-btn mt-5" disabled={pending} onClick={search}>
          {pending ? "Reading the market…" : pack?.summary ? "Refresh market research" : "Run market search"}
        </button>
        {error ? <p className="mt-3 text-flag-red">{error}</p> : null}
      </Section>

      {pack?.insights.length ? (
        <Section title="Insights">
          <ul className="founder-spikes" style={{ marginTop: 0 }}>
            {pack.insights.map((item) => (
              <li key={item.title}>
                <strong>{item.title}</strong>
                {item.detail}
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      {cites.length ? (
        <Section title="Sources">
          <ol className="founder-cites" style={{ marginTop: 0 }}>
            {cites.map((hit, index) => (
              <li key={hit.url}>
                <a href={hit.url} target="_blank" rel="noreferrer">
                  [{index + 1}] {hit.title.replace(/\s*[|#].*$/, "").trim() || hit.url}
                </a>
              </li>
            ))}
          </ol>
        </Section>
      ) : null}
    </div>
  );
}

function asMarket(raw: unknown): MarketResearch | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const insights = asInsights(row.insights);
  const tam = asHits(row.tam);
  const competitors = asHits(row.competitors);
  const space = asHits(row.space);
  if (!insights.length && !tam.length && !competitors.length && !space.length) return null;
  return {
    deckTam: typeof row.deckTam === "string" ? row.deckTam : undefined,
    summary: typeof row.summary === "string" ? row.summary : "",
    insights,
    tam,
    competitors,
    space,
    at: typeof row.at === "string" ? row.at : "",
  };
}

function asInsights(raw: unknown): MarketInsight[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const row = item as Record<string, unknown>;
      if (typeof row.title !== "string" || typeof row.detail !== "string") return null;
      return { title: row.title, detail: row.detail };
    })
    .filter((item): item is MarketInsight => Boolean(item));
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

function uniqueHits(hits: ResearchHit[]): ResearchHit[] {
  const seen = new Set<string>();
  return hits.filter((hit) => {
    if (seen.has(hit.url)) return false;
    seen.add(hit.url);
    return true;
  });
}
