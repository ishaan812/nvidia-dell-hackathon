"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { ThesisSettings } from "@/lib/intelligence/types";

type Props = { thesis: ThesisSettings };

function lines(value: string) {
  return value
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}

function Field({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-[14px] text-mute">{label}</span>
      {hint ? <span className="mt-1 block text-[13px] text-mute">{hint}</span> : null}
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={3}
        className="mt-2 w-full border border-line bg-transparent px-3 py-2 text-[16px] leading-6"
      />
    </label>
  );
}

export function ThesisForm({ thesis }: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [preferredSectors, setPreferredSectors] = useState(thesis.preferredSectors.join("\n"));
  const [avoidedSectors, setAvoidedSectors] = useState(thesis.avoidedSectors.join("\n"));
  const [preferredStages, setPreferredStages] = useState(thesis.preferredStages.join("\n"));
  const [preferredGeographies, setPreferredGeographies] = useState(thesis.preferredGeographies.join("\n"));
  const [check, setCheck] = useState(`${thesis.checkSizeMin} – ${thesis.checkSizeMax}`);
  const [hardConstraints, setHardConstraints] = useState(thesis.hardConstraints.join("\n"));

  return (
    <form
      className="grid gap-6"
      onSubmit={(event) => {
        event.preventDefault();
        setError(null);
        const [min, max] = check.split("–").map((part) => part.trim());
        const next: ThesisSettings = {
          ...thesis,
          preferredSectors: lines(preferredSectors),
          avoidedSectors: lines(avoidedSectors),
          preferredStages: lines(preferredStages),
          preferredGeographies: lines(preferredGeographies),
          checkSizeMin: min || thesis.checkSizeMin,
          checkSizeMax: max || thesis.checkSizeMax,
          hardConstraints: lines(hardConstraints),
        };
        start(async () => {
          const res = await fetch("/api/thesis", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(next),
          });
          if (!res.ok) {
            setError("Could not save the thesis.");
            return;
          }
          router.refresh();
        });
      }}
    >
      <p className="text-[15px] leading-7 text-mute">
        Hard constraints warn. They do not auto-pass a deal. Lumen Health is the exception story.
      </p>
      <Field label="We like" value={preferredSectors} onChange={setPreferredSectors} />
      <Field
        label="We avoid"
        hint="Raises a thesis exception — the deal still gets scored."
        value={avoidedSectors}
        onChange={setAvoidedSectors}
      />
      <Field label="Stages" value={preferredStages} onChange={setPreferredStages} />
      <Field label="Geographies" value={preferredGeographies} onChange={setPreferredGeographies} />
      <label className="block">
        <span className="text-[14px] text-mute">Check size</span>
        <input
          value={check}
          onChange={(e) => setCheck(e.target.value)}
          className="mt-2 w-full border border-line bg-transparent px-3 py-2 text-[16px] leading-6"
        />
      </label>
      <Field label="Hard constraints" value={hardConstraints} onChange={setHardConstraints} />
      <button
        type="submit"
        disabled={pending}
        className="w-fit bg-paper px-5 py-3 text-[15px] text-ink disabled:opacity-50"
      >
        {pending ? "Saving…" : "Save thesis"}
      </button>
      {error ? <p className="text-flag-red">{error}</p> : null}
    </form>
  );
}
