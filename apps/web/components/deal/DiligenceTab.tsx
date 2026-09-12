"use client";

import { useRouter, useSearchParams } from "next/navigation";
import type { Deal } from "@/lib/diligence/types";
import type { DealIntelligence } from "@/lib/intelligence/types";
import { FinancialsPane } from "./FinancialsPane";
import { FounderPane } from "./FounderPane";
import { MarketPane } from "./MarketPane";

const PANES = [
  { id: "founder", label: "Founder" },
  { id: "financials", label: "Financials" },
  { id: "market", label: "Market" },
] as const;

type Pane = (typeof PANES)[number]["id"];

export function DiligenceTab({ deal, intel }: { deal: Deal; intel: DealIntelligence }) {
  const params = useSearchParams();
  const router = useRouter();
  const raw = params.get("pane");
  const pane = (PANES.some((item) => item.id === raw) ? raw : "financials") as Pane;

  function open(id: Pane) {
    router.replace(`/deals/${deal.id}?tab=diligence&pane=${id}`, { scroll: false });
  }

  return (
    <div>
      <nav className="diligence-panes" aria-label="Due diligence">
        {PANES.map((item) => (
          <button
            key={item.id}
            type="button"
            className={pane === item.id ? "is-on" : ""}
            onClick={() => open(item.id)}
          >
            {item.label}
          </button>
        ))}
      </nav>
      {pane === "founder" ? <FounderPane dealId={deal.id} intel={intel} /> : null}
      {pane === "financials" ? <FinancialsPane deal={deal} intel={intel} /> : null}
      {pane === "market" ? <MarketPane dealId={deal.id} intel={intel} /> : null}
    </div>
  );
}
