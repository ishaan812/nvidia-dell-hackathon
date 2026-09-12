type Props = {
  verdict?: string;
  bodyMarkdown?: string;
};

function memoHtml(src: string): string {
  return src
    .replace(/^### (.*)$/gm, "<h3>$1</h3>")
    .replace(/^## (.*)$/gm, "<h2>$1</h2>")
    .replace(/^- (.*)$/gm, "<li>$1</li>")
    .replace(/(<li>.*<\/li>\n?)+/g, "<ul>$&</ul>")
    .replace(/\n{2,}/g, "<p></p>");
}

export function MemoPanel({ verdict, bodyMarkdown }: Props) {
  if (!bodyMarkdown) {
    return <p className="text-[15px] leading-7 text-ink/55">The memo is still being written.</p>;
  }

  return (
    <article className="mx-auto max-w-2xl">
      {verdict ? <p className="font-mono text-[12px] text-copper">{verdict}</p> : null}
      <div
        className="memo-body mt-5 font-serif text-[17px] leading-8"
        dangerouslySetInnerHTML={{ __html: memoHtml(bodyMarkdown) }}
      />
    </article>
  );
}
