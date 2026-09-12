import { courtCopy, verbsFor } from "@/lib/intelligence/verbs";
import type { DealIntelligence } from "@/lib/intelligence/types";

export function DealVerbs({ dealId, intel }: { dealId: string; intel: DealIntelligence }) {
  const verbs = verbsFor(intel);
  if (!verbs.length) return null;

  return (
    <div className="deal-verbs">
      <p className="deal-court">{courtCopy(intel)}</p>
      <div className="deal-verbs-row">
        {verbs.map((verb) => (
          <form key={`${verb.gate}-${verb.choice}`} action={`/api/deals/${dealId}/decide`} method="post">
            <input type="hidden" name="gate" value={verb.gate} />
            <input type="hidden" name="choice" value={verb.choice} />
            <button type="submit" className={verb.primary ? "desk-btn" : "desk-btn-quiet"}>
              {verb.label}
            </button>
          </form>
        ))}
      </div>
    </div>
  );
}
