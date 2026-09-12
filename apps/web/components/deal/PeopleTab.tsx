import type { DealIntelligence } from "@/lib/intelligence/types";
import { Note, Section } from "./ui";

function Block({
  title,
  notes,
}: {
  title: string;
  notes: DealIntelligence["people"];
}) {
  return (
    <Section title={title} lead="Claims stay separate from verified evidence.">
      {notes.length === 0 ? (
        <Note>Nothing recorded yet.</Note>
      ) : (
        <ul className="divide-y divide-white/10">
          {notes.map((note) => (
            <li key={note.title} className="py-5">
              <p className="kind-pill">{note.title}</p>
              <p className="mt-2 text-[16px]">{note.claim}</p>
              <p className="mt-2 text-[14px] text-paper/65">Evidence: {note.evidence}</p>
              <p className="mt-1 text-[14px] text-paper/80">Assessment: {note.assessment}</p>
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}

export function PeopleTab({ intel }: { intel: DealIntelligence }) {
  return (
    <div>
      <Block title="People" notes={intel.people} />
      <Block title="Product" notes={intel.product} />
    </div>
  );
}
