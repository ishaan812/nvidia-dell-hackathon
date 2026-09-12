"use client";

import { AskTab } from "./deal/AskTab";

type Props = {
  dealId: string;
  company?: string;
  suggestions?: string[];
  compact?: boolean;
};

export function AskPanel({ dealId, company, suggestions, compact = false }: Props) {
  return (
    <AskTab
      dealId={dealId}
      company={company}
      suggestions={suggestions}
      compact={compact}
      surface="memo"
    />
  );
}
