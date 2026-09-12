"use client";

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

export type DiligencePane = (typeof PANES)[number]["id"];

type Props = {
  deal: Deal;
  intel: DealIntelligence;
  pane: DiligencePane;
  onPane: (id: DiligencePane) => void;
};

export function DiligenceTab({ deal, intel, pane, onPane }: Props) {
  return (
    <div>
      <nav className="diligence-panes" aria-label="Due diligence">
        {PANES.map((item) => (
          <button
            key={item.id}
            type="button"
            className={pane === item.id ? "is-on" : ""}
            onClick={() => onPane(item.id)}
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
