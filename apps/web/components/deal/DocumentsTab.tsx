import Link from "next/link";
import type { Deal } from "@/lib/diligence/types";
import type { DealIntelligence } from "@/lib/intelligence/types";
import { Section } from "./ui";

export function DocumentsTab({ deal, intel }: { deal: Deal; intel: DealIntelligence }) {
  return (
    <Section
      title="Documents"
      lead="The existing data room and deck review still do the file work. This page is the index."
    >
      <div className="flex flex-wrap gap-3">
        <Link
          href={`/deals/${deal.id}/room`}
          className="bg-paper px-4 py-3 text-[14px] text-ink hover:bg-white"
        >
          Open the data room
        </Link>
        <Link
          href={`/deals/${deal.id}/deck`}
          className="border border-white/20 px-4 py-3 text-[14px] hover:border-copper"
        >
          Open the deck desk
        </Link>
      </div>
      <ul className="mt-8 divide-y divide-white/10">
        {deal.docs.map((doc) => (
          <li key={doc.docId} className="flex flex-wrap justify-between gap-3 py-3">
            <p>{doc.filename}</p>
            <p className="font-mono text-[11px] text-paper/50">
              {doc.kind} · {doc.role}
            </p>
          </li>
        ))}
      </ul>
      {intel.versions.length ? (
        <p className="mt-6 text-[14px] text-paper/60">
          {intel.versions.length} stored version{intel.versions.length === 1 ? "" : "s"} — see Process.
        </p>
      ) : null}
    </Section>
  );
}
