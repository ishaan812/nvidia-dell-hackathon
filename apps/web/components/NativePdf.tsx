"use client";

type Props = {
  src: string;
  page?: number | null;
  title?: string;
  fill?: boolean;
};

export function NativePdf({ src, page, title = "PDF", fill = false }: Props) {
  const shown = page && page > 0 ? page : 1;
  const url = `${src}#page=${shown}&view=FitH&zoom=page-width`;
  return <iframe key={url} title={title} src={url} className={`native-pdf${fill ? " is-fill" : ""}`} />;
}
