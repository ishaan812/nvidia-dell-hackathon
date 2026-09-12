export default function DeckLoading() {
  return (
    <div className="flex h-screen flex-col bg-desk text-paper">
      <div className="border-b border-white/10 px-6 py-5">
        <p className="font-mono text-[12px] text-paper/40">Opening the deck…</p>
      </div>
      <div className="flex-1 bg-[#d8dee4]" />
    </div>
  );
}
