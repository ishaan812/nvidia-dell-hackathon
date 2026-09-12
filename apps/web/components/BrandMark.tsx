import { LAMP } from "@/lib/brand";

type Props = {
  size?: number;
  className?: string;
};

export function BrandMark({ size = 22, className }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path d={LAMP.shade} fill="currentColor" />
      <rect x="11.2" y="10.8" width="1.6" height="6.85" rx="0.8" fill="currentColor" />
      <path d={LAMP.base} fill="currentColor" />
      <rect x="4.6" y="21.45" width="14.8" height="1.15" rx="0.58" fill="currentColor" opacity="0.45" />
    </svg>
  );
}
