"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { Deal } from "@/lib/diligence/types";
import type { DealIntelligence } from "@/lib/intelligence/types";
import { normalizeStage } from "@/lib/intelligence/types";
import { AppChrome } from "../AppChrome";
import { PageFrame } from "../PageFrame";
import { StageRail } from "../pipeline/StageRail";
import { AskTab } from "./AskTab";
import { DealHeader } from "./DealHeader";
import { DiligenceTab } from "./DiligenceTab";
import { OverviewTab } from "./OverviewTab";
import { ThesisTab } from "./ThesisTab";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "thesis", label: "Thesis" },
  { id: "diligence", label: "Due diligence" },
  { id: "ask", label: "Ask" },
] as const;

const ALIASES: Record<string, (typeof TABS)[number]["id"]> = {
  validation: "diligence",
  numbers: "diligence",
  questions: "diligence",
  claims: "diligence",
  evidence: "diligence",
  findings: "diligence",
  world: "diligence",
  people: "diligence",
  risks: "diligence",
  process: "overview",
  documents: "overview",
  room: "overview",
  decision: "overview",
  ic: "overview",
  timeline: "overview",
  valuation: "overview",
  stage: "overview",
  chat: "ask",
  analyst: "ask",
};

type TabId = (typeof TABS)[number]["id"];

type Props = {
  deal: Deal;
  intel: DealIntelligence;
  model?: string;
};

export function DealShell({ deal, intel, model }: Props) {
  const params = useSearchParams();
  const router = useRouter();
  const raw = params.get("tab") ?? "overview";
  const tab = (TABS.some((t) => t.id === raw) ? raw : ALIASES[raw] ?? "overview") as TabId;
  const stage = normalizeStage(intel.stage);
  const validated = deal.flags.length > 0 || intel.claims.length > 0;
  const decided = Boolean(intel.ic && !intel.pendingGate && stage === "decision_room");

  useEffect(() => {
    if (!intel.pendingGate) return;
    const tick = window.setInterval(() => router.refresh(), 3000);
    return () => window.clearInterval(tick);
  }, [intel.pendingGate, router]);

  function open(id: TabId) {
    router.replace(id === "diligence" ? `/deals/${deal.id}?tab=diligence&pane=financials` : `/deals/${deal.id}?tab=${id}`, {
      scroll: false,
    });
  }

  const waiting = intel.pendingGate
    ? intel.pendingGate.id === "founder"
      ? "Waiting on founder"
      : "Waiting on you"
    : decided
      ? "Decision recorded"
      : undefined;

  return (
    <div className="min-h-screen">
      <a href="#deal-main" className="skip-link">
        Skip to deal
      </a>
      <PageFrame>
        <header className="pb-6 pt-10">
          <AppChrome model={model} />
          <DealHeader intel={intel} flags={deal.flags} waiting={waiting} />
          <div className="mt-6">
            <StageRail current={stage} validated={validated} decided={decided} />
          </div>
        </header>
        <nav className="deal-tabs" aria-label="Deal sections">
          {TABS.slice(0, 3).map((item) => (
            <button
              key={item.id}
              type="button"
              className={`deal-tab ${tab === item.id ? "is-on" : ""}`}
              onClick={() => open(item.id)}
            >
              {item.label}
            </button>
          ))}
          <a
            className="deal-tab deal-tab-ext"
            href={`/deals/${deal.id}/room`}
            target="_blank"
            rel="noreferrer"
          >
            Data room
            <span className="sr-only"> (opens in a new tab)</span>
            <ExternalIcon />
          </a>
          {TABS.slice(3).map((item) => (
            <button
              key={item.id}
              type="button"
              className={`deal-tab ${tab === item.id ? "is-on" : ""}`}
              onClick={() => open(item.id)}
            >
              {item.label}
            </button>
          ))}
        </nav>
        <main id="deal-main" className="pb-20">
          {tab === "overview" ? <OverviewTab intel={intel} /> : null}
          {tab === "thesis" ? <ThesisTab intel={intel} /> : null}
          {tab === "diligence" ? <DiligenceTab deal={deal} intel={intel} /> : null}
          {tab === "ask" ? (
            <AskTab
              dealId={deal.id}
              company={intel.profile.company}
              model={model}
              suggestions={[
                "Why is conviction at this level?",
                "What concerns us most?",
                "Challenge the investment case.",
                "What would change our view?",
              ]}
            />
          ) : null}
        </main>
      </PageFrame>
    </div>
  );
}

function ExternalIcon() {
  return (
    <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true">
      <path
        fill="currentColor"
        d="M6.5 2H3.25C2.56 2 2 2.56 2 3.25v9.5C2 13.44 2.56 14 3.25 14h9.5c.69 0 1.25-.56 1.25-1.25V9.5h-1.5v3.25H3.5V3.5H6.5V2Zm3.25 0H14v4.25h-1.5V4.56L7.78 9.28 6.72 8.22l4.72-4.72H9.75V2Z"
      />
    </svg>
  );
}
