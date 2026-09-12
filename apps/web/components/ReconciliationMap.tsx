import type { ReconcileRow, ReconcileStatus } from "@/lib/diligence/types";

const TONE: Record<ReconcileStatus, { label: string; className: string }> = {
  contradiction: { label: "Doesn't match", className: "text-flag-red" },
  unsupported: { label: "Only on the deck", className: "text-flag-amber" },
  gap: { label: "Not in the room", className: "text-flag-gray" },
  "deck-only": { label: "Deck only", className: "text-ink/45" },
  "room-only": { label: "Room only", className: "text-ink/45" },
  match: { label: "Lines up", className: "text-ledger" },
};

type Props = {
  rows: ReconcileRow[];
  activeId: string | null;
  onOpenFlag: (id: string) => void;
  compact?: boolean;
};

export function ReconciliationMap({ rows, activeId, onOpenFlag, compact = false }: Props) {
  return (
    <div className={compact ? "px-6 py-6" : "mx-auto max-w-3xl px-8 py-10"}>
      <h2 className={`font-serif text-ink ${compact ? "text-[26px] leading-tight" : "text-3xl"}`}>
        What the deck says vs the room
      </h2>
      <p className="mt-3 max-w-xl text-[15px] leading-7 text-ink/60">
        Same number, two sources. Red means the slide and the spreadsheet do not agree. Use the
        data-room figure unless you have a reason not to.
      </p>
      {rows.length === 0 ? (
        <p className="mt-10 text-[15px] text-ink/45">No numbers to compare yet.</p>
      ) : (
        <ol className="mt-10">
          {rows.map((row) => {
            const tone = TONE[row.status];
            const open = row.flagId ? () => onOpenFlag(row.flagId!) : undefined;
            const Tag = open ? "button" : "div";
            return (
              <li key={row.metric} className="recon-row">
                <Tag
                  type={open ? "button" : undefined}
                  onClick={open}
                  className={`w-full py-6 text-left ${row.flagId ? "cursor-pointer" : ""} ${
                    activeId && row.flagId === activeId ? "bg-black/3" : ""
                  }`}
                >
                  <div className="flex items-baseline justify-between gap-4">
                    <h3 className="font-serif text-[22px] text-ink">{row.label}</h3>
                    <span className={`font-mono text-[11px] ${tone.className}`}>{tone.label}</span>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-6">
                    <p>
                      <span className="block font-mono text-[11px] text-ink/40">Deck</span>
                      <span className="mt-1 block text-[20px] text-ink">{row.deck ?? "—"}</span>
                      {row.page ? (
                        <span className="mt-1 block font-mono text-[11px] text-ink/40">
                          slide {row.page}
                        </span>
                      ) : null}
                    </p>
                    <p>
                      <span className="block font-mono text-[11px] text-ink/40">Data room</span>
                      <span className="mt-1 block text-[20px] text-ink">{row.room ?? "—"}</span>
                      {row.roomSource ? (
                        <span className="mt-1 block font-mono text-[11px] text-ink/40">
                          {row.roomSource}
                        </span>
                      ) : null}
                    </p>
                  </div>
                  {row.comment ? (
                    <p className="mt-4 max-w-xl text-[14px] leading-6 text-ink/65">{row.comment}</p>
                  ) : null}
                </Tag>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
