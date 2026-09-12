import Link from "next/link";
import { BRAND } from "@/lib/brand";
import { BrandMark } from "./BrandMark";

type Props = {
  href?: string;
  compact?: boolean;
  size?: number;
};

export function BrandLogo({ href = "/", compact = false, size = 22 }: Props) {
  if (compact) {
    return (
      <Link href={href} aria-label={BRAND.name} className="brand-logo is-compact">
        <BrandMark size={size} />
      </Link>
    );
  }

  return (
    <Link href={href} className="brand-logo">
      <BrandMark size={size} />
      <span className="brand-wordmark">{BRAND.name}</span>
    </Link>
  );
}
