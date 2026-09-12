import type { DealIntelligence } from "@/lib/intelligence/types";
import { ICTab } from "./ICTab";

export function OverviewTab({ intel }: { intel: DealIntelligence }) {
  return <ICTab intel={intel} />;
}
