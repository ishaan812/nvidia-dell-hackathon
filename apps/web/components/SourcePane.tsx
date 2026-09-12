import type { FlagView, WorkbookGrid } from "@/lib/diligence/types";
import { FilePreview } from "./FilePreview";

const SEV = {
  contradiction: { label: "Doesn't match", className: "text-flag-red" },
  unsupported: { label: "Only on the deck", className: "text-flag-amber" },
  missing: { label: "Missing from the room", className: "text-flag-gray" },
};

type Props = {
  dealId: string;
  flag: FlagView | null;
  workbook?: WorkbookGrid | null;
};

export function SourcePane({ dealId, flag, workbook }: Props) {
  if (!flag) {
    return (
      <div className="px-6 py-7">
        <p className="font-serif text-[22px] leading-8 text-ink/70">
          Click a mark on the slide. This pane opens the number and the file behind it.
        </p>
      </div>
    );
  }

  const meta = SEV[flag.severity];
  const source = flag.source;
  const href = flag.sourceFile
    ? `/api/deals/${dealId}/file?name=${encodeURIComponent(flag.sourceFile)}`
    : null;
  const openHref = flag.sourceFile
    ? `/deals/${dealId}/preview?name=${encodeURIComponent(flag.sourceFile)}`
    : null;

  return (
    <div className="px-6 py-6">
      <p className={`font-mono text-[11px] ${meta.className}`}>{meta.label}</p>
      <h2 className="mt-1 font-serif text-[26px] leading-tight">{flag.label}</h2>
      <p className="mt-3 text-[14px] leading-6 text-ink/65">{flag.comment}</p>

      <div className="mt-6 flex items-end gap-5">
        <div className="min-w-0 flex-1">
          <p className="font-mono text-[11px] text-ink/40">Slide{flag.page ? ` ${flag.page}` : ""}</p>
          <p className="mt-1 font-serif text-[32px] leading-none tracking-tight">
            {flag.deckValue ?? flag.quote ?? "—"}
          </p>
        </div>
        <p className="mb-1 font-mono text-[12px] text-ink/25">→</p>
        <div className="min-w-0 flex-1">
          <p className="font-mono text-[11px] text-ink/40">This file</p>
          <p className="mt-1 font-serif text-[32px] leading-none tracking-tight">
            {flag.roomValue ?? "—"}
          </p>
        </div>
      </div>

      {source && source.kind !== "missing" ? (
        <div className="mt-7">
          <FilePreview
            preview={{ ...source, highlight: source.highlight ?? flag.roomValue }}
            href={href ?? undefined}
            openHref={openHref ?? undefined}
            compact
            grid={workbook}
          />
        </div>
      ) : null}

      {source?.kind === "missing" ? (
        <div className="source-file mt-7">
          <header>
            <span>Data room</span>
          </header>
          <p className="excerpt">
            No file in this room cites {flag.deckValue ?? "that number"}. The slide is standing
            alone.
          </p>
        </div>
      ) : null}
    </div>
  );
}
