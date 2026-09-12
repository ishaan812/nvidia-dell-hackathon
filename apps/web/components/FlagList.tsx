import type { FlagView } from "@/lib/diligence/types";

const SEV = {
  contradiction: { label: "Doesn't match", color: "text-flag-red", rule: "border-flag-red" },
  unsupported: { label: "Only on the deck", color: "text-flag-amber", rule: "border-flag-amber" },
  missing: { label: "Missing", color: "text-flag-gray", rule: "border-flag-gray" },
};

const ORDER = { contradiction: 0, unsupported: 1, missing: 2 };

type Props = {
  flags: FlagView[];
  activeId: string | null;
  hrefFor: (id: string) => string;
  onSelect?: (id: string) => void;
};

export function FlagList({ flags, activeId, hrefFor, onSelect }: Props) {
  const sorted = flags.toSorted(
    (a, b) => ORDER[a.severity] - ORDER[b.severity] || (a.page ?? 99) - (b.page ?? 99),
  );

  return (
    <aside className="min-h-0 overflow-y-auto border-r border-white/10">
      <p className="px-5 pt-5 text-[13px] text-paper/45">On the slides</p>
      {sorted.length === 0 ? (
        <p className="px-5 py-6 text-[14px] leading-6 text-paper/40">No flags on this deck yet.</p>
      ) : (
        <ul>
          {sorted.map((flag) => {
            const meta = SEV[flag.severity];
            const on = activeId === flag.id;
            return (
              <li key={flag.id} className="flag-row">
                <a
                  href={hrefFor(flag.id)}
                  target="_top"
                  aria-current={on ? "true" : undefined}
                  onClick={() => onSelect?.(flag.id)}
                  className={`block w-full border-l-2 px-5 py-4 text-left ${meta.rule} ${on ? "bg-white/6" : ""}`}
                >
                  <div className="flex items-baseline justify-between gap-3">
                    <span className={`font-mono text-[11px] ${meta.color}`}>{meta.label}</span>
                    <span className="font-mono text-[11px] text-paper/35">
                      {flag.page ? `slide ${flag.page}` : "room"}
                    </span>
                  </div>
                  <p className="mt-1.5 text-[14px] leading-5 text-paper/85">{flag.comment}</p>
                </a>
              </li>
            );
          })}
        </ul>
      )}
    </aside>
  );
}
