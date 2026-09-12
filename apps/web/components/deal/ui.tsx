import type { ReactNode } from "react";

export function Section({
  title,
  lead,
  children,
}: {
  title: string;
  lead?: string;
  children: ReactNode;
}) {
  return (
    <section className="desk-card">
      <h2 className="font-serif text-[1.6rem] leading-tight">{title}</h2>
      {lead ? <p className="mt-2 max-w-[38rem] text-[1rem] leading-7 text-mute">{lead}</p> : null}
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function Note({ children }: { children: ReactNode }) {
  return <p className="text-[16px] leading-7 text-mute">{children}</p>;
}

export function List({ items }: { items: string[] }) {
  if (!items.length) return <Note>None recorded.</Note>;
  return (
    <ul className="space-y-2 text-[16px] leading-7">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}
