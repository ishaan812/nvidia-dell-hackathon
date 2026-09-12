import type { FileLink, ReconcileStatus } from "@/lib/diligence/types";

const TONE: Record<ReconcileStatus, string> = {
  contradiction: "Doesn't match",
  unsupported: "Deck only",
  gap: "Missing",
  "deck-only": "Deck only",
  "room-only": "Room only",
  match: "Lines up",
};

type Props = {
  links: FileLink[];
  onOpenFile?: (filename: string) => void;
};

export function FileGraph({ links, onOpenFile }: Props) {
  if (links.length === 0) {
    return <p className="text-[15px] leading-7 text-paper/45">No shared numbers yet.</p>;
  }

  return (
    <ol className="file-graph">
      {links.map((link) => (
        <li key={link.metric} className="file-link">
          <p className="from">{link.deckFile ?? "Deck"}</p>
          <div className="mid">
            <p className="label">{link.label}</p>
            <p className="values">
              <span>{link.deckValue ?? "—"}</span>
              <span className="sep">→</span>
              <span>{link.roomValue ?? "—"}</span>
            </p>
            <p className={`tone tone-${link.status}`}>{TONE[link.status]}</p>
          </div>
          {link.roomFile && onOpenFile ? (
            <button type="button" className="to" onClick={() => onOpenFile(link.roomFile!)}>
              {link.roomFile}
              {link.roomSheet ? <span> · {link.roomSheet}</span> : null}
            </button>
          ) : (
            <p className="to muted">{link.roomFile ?? "not in the room"}</p>
          )}
        </li>
      ))}
    </ol>
  );
}
