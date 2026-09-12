"use client";

import type { DealFile, DealLobbyView, SourcePreview } from "@/lib/diligence/types";
import { AskPanel } from "./AskPanel";
import { FilePreview } from "./FilePreview";
import { ReconciliationMap } from "./ReconciliationMap";
import { RoomGraph } from "./RoomGraph";

const TABS = [
  { id: "graph", label: "Graph" },
  { id: "compare", label: "Compare" },
  { id: "ask", label: "Ask" },
  { id: "file", label: "File" },
] as const;

export type RoomDeskTab = (typeof TABS)[number]["id"];

type Props = {
  deal: DealLobbyView;
  tab: RoomDeskTab;
  onTab: (tab: RoomDeskTab) => void;
  file?: DealFile;
  preview?: SourcePreview;
  onOpenFile: (filename: string) => void;
  onCloseFile: () => void;
  onOpenDeck: () => void;
};

export function RoomDesk({
  deal,
  tab,
  onTab,
  file,
  preview,
  onOpenFile,
  onCloseFile,
  onOpenDeck,
}: Props) {
  return (
    <aside className="lobby-preview room-desk" id="room-desk" aria-label="Room desk">
      <nav className="room-desk-tabs" aria-label="Room desk">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`side-desk-tab ${tab === item.id ? "is-on" : ""}`}
            aria-current={tab === item.id ? "true" : undefined}
            onClick={() => onTab(item.id)}
          >
            {item.label}
          </button>
        ))}
      </nav>
      <div className="room-desk-body">
        {tab === "graph" ? (
          <RoomGraph graph={deal.graph} activeFile={file?.filename} onOpenFile={onOpenFile} />
        ) : null}
        {tab === "compare" ? (
          <ReconciliationMap rows={deal.reconcile} activeId={null} compact onOpenFlag={onOpenDeck} />
        ) : null}
        {tab === "ask" ? <AskPanel dealId={deal.id} compact /> : null}
        {tab === "file" ? (
          preview && file ? (
            <FilePreview
              preview={preview}
              href={file.href}
              onClose={onCloseFile}
              openHref={
                file.role === "deck"
                  ? `/deals/${deal.id}/deck?name=${encodeURIComponent(file.filename)}`
                  : `/deals/${deal.id}/preview?name=${encodeURIComponent(file.filename)}`
              }
            />
          ) : (
            <div className="px-6 py-7">
              <p className="font-serif text-[22px] leading-8 text-ink/70">
                Click a file in the room, or a node on the graph.
              </p>
            </div>
          )
        ) : null}
      </div>
    </aside>
  );
}
