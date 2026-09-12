"use client";

import type { DealRoomView, FlagView, WorkbookGrid } from "@/lib/diligence/types";
import { AskPanel } from "./AskPanel";
import { MemoPanel } from "./MemoPanel";
import { ReconciliationMap } from "./ReconciliationMap";
import { SourcePane } from "./SourcePane";

const PANES = [
  { id: "source", label: "Source" },
  { id: "compare", label: "Compare" },
  { id: "memo", label: "Memo" },
  { id: "ask", label: "Ask" },
] as const;

export type SidePane = (typeof PANES)[number]["id"];

type Props = {
  deal: DealRoomView;
  flag: FlagView | null;
  pane: SidePane;
  onPane: (pane: SidePane) => void;
  onOpenFlag: (id: string) => void;
  workbook?: WorkbookGrid | null;
};

export function SideDesk({ deal, flag, pane, onPane, onOpenFlag, workbook }: Props) {
  return (
    <aside
      id="side-desk"
      className="flex min-h-0 min-w-0 flex-col border-l border-black/10 bg-memo text-ink"
    >
      <nav className="flex shrink-0 border-b border-black/10 px-2" aria-label="Desk panels">
        {PANES.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onPane(item.id)}
            aria-current={pane === item.id ? "true" : undefined}
            className={`side-desk-tab px-3 py-3 text-[14px] ${pane === item.id ? "is-on text-ink" : "text-ink/55"}`}
          >
            {item.label}
          </button>
        ))}
      </nav>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {pane === "source" ? (
          <SourcePane dealId={deal.id} flag={flag} workbook={workbook} />
        ) : pane === "compare" ? (
          <ReconciliationMap
            rows={deal.reconcile}
            activeId={flag?.id ?? null}
            onOpenFlag={onOpenFlag}
            compact
          />
        ) : pane === "memo" ? (
          <div className="px-6 py-6">
            <MemoPanel verdict={deal.memo?.verdict} bodyMarkdown={deal.memo?.bodyMarkdown} />
          </div>
        ) : (
          <AskPanel dealId={deal.id} compact />
        )}
      </div>
    </aside>
  );
}
