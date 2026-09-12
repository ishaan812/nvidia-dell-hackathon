import Link from "next/link";
import type { ReactNode } from "react";
import { BrandLogo } from "./BrandLogo";
import { ModelBadge } from "./ModelBadge";
import { ThemeToggle } from "./ThemeToggle";

type Props = {
  backHref?: string;
  extra?: ReactNode;
  model?: string;
  modelOk?: boolean;
};

export function AppChrome({ backHref = "/", extra, model, modelOk }: Props) {
  return (
    <div className="app-chrome">
      <BrandLogo href={backHref} />
      <nav className="app-chrome-nav" aria-label="App">
        {extra}
        <Link href="/thesis">Thesis</Link>
        <ModelBadge name={model} ok={modelOk} />
        <ThemeToggle />
      </nav>
    </div>
  );
}
