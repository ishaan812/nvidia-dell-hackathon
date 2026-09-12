import Link from "next/link";
import type { ReactNode } from "react";
import { BrandLogo } from "./BrandLogo";
import { ThemeToggle } from "./ThemeToggle";

type Props = {
  backHref?: string;
  extra?: ReactNode;
};

export function AppChrome({ backHref = "/", extra }: Props) {
  return (
    <div className="app-chrome">
      <BrandLogo href={backHref} />
      <nav className="app-chrome-nav" aria-label="App">
        {extra}
        <Link href="/thesis">Thesis</Link>
        <ThemeToggle />
      </nav>
    </div>
  );
}
