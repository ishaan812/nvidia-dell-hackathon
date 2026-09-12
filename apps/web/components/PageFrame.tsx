import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
};

export function PageFrame({ children }: Props) {
  return <div className="page-frame">{children}</div>;
}
