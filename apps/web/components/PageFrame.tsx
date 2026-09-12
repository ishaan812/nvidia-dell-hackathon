import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  wide?: boolean;
};

export function PageFrame({ children, wide = false }: Props) {
  return <div className={`page-frame${wide ? " is-wide" : ""}`}>{children}</div>;
}
