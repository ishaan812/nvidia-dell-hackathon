"use client";

type Props = {
  html?: string;
  paragraphs?: string[];
  compact?: boolean;
};

export function WordViewer({ html, paragraphs, compact = false }: Props) {
  const blocks =
    paragraphs?.length && !html
      ? paragraphs.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join("")
      : html;

  if (!blocks) return <p className="xl-error">This document is empty.</p>;

  return (
    <div className={`word-app ${compact ? "is-compact" : ""}`}>
      <div className="word-page" dangerouslySetInnerHTML={{ __html: blocks }} />
    </div>
  );
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
