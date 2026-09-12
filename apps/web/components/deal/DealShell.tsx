"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { Deal } from "@/lib/diligence/types";
import type { DealIntelligence } from "@/lib/intelligence/types";
import { STAGE_LABELS, normalizeStage } from "@/lib/intelligence/types";
import { AppChrome } from "../AppChrome";
import { PageFrame } from "../PageFrame";
import { StageRail } from "../pipeline/StageRail";
import { ICTab } from "./ICTab";
import { OverviewTab } from "./OverviewTab";
import { ProcessTab } from "./ProcessTab";
import { ThesisTab } from "./ThesisTab";
import { ValidationTab } from "./ValidationTab";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "thesis", label: "Thesis" },
  { id: "validation", label: "Validation" },
  { id: "process", label: "Process" },
  { id: "decision", label: "Decision Room" },
] as const;

const ALIASES: Record<string, (typeof TABS)[number]["id"]> = {
  ic: "decision",
  timeline: "decision",
  valuation: "decision",
  numbers: "validation",
  questions: "validation",
  claims: "validation",
  evidence: "validation",
  findings: "validation",
  world: "validation",
  people: "validation",
  risks: "validation",
  documents: "process",
  stage: "overview",
};

type TabId = (typeof TABS)[number]["id"];

type Props = {
  deal: Deal;
  intel: DealIntelligence;
};

export function DealShell({ deal, intel }: Props) {
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
    router.replace(`/deals/${deal.id}?tab=${id}`, { scroll: false });
  }

  return (
    <div className="min-h-screen">
      <a href="#deal-main" className="skip-link">
        Skip to deal
      </a>
      <PageFrame>
        <header className="pb-6 pt-10">
          <AppChrome
            extra={
              <Link href={`/deals/${deal.id}/room`}>
                Data room
              </Link>
            }
          />
          <h1 className="mt-9 font-serif text-[2.5rem] font-medium leading-none tracking-tight">
            {intel.profile.company}
          </h1>
          <p className="mt-3 max-w-xl text-[1.05rem] leading-7 text-mute">
            <span className="text-copper">{STAGE_LABELS[stage]}</span>
            {intel.thesis.exceptions.length ? (
              <span className="text-flag-amber"> · Thesis exception</span>
            ) : null}
            {intel.pendingGate ? (
              <span className="text-flag-amber">
                {" "}
                · {intel.pendingGate.id === "founder" ? "Waiting on founder" : "Waiting on partner"}
              </span>
            ) : decided ? (
              <span className="text-ledger"> · Decision recorded</span>
            ) : null}
            {intel.profile.product ? ` · ${intel.profile.product}` : ""}
          </p>
          <div className="mt-5">
            <StageRail current={stage} validated={validated} decided={decided} />
          </div>
        </header>

        <nav className="deal-tabs" aria-label="Deal sections">
          {TABS.map((item) => (
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
          {tab === "overview" ? <OverviewTab deal={deal} intel={intel} /> : null}
          {tab === "thesis" ? <ThesisTab intel={intel} /> : null}
          {tab === "validation" ? <ValidationTab deal={deal} intel={intel} /> : null}
          {tab === "process" ? <ProcessTab deal={deal} intel={intel} /> : null}
          {tab === "decision" ? <ICTab dealId={deal.id} intel={intel} /> : null}
        </main>
      </PageFrame>
    </div>
  );
}
