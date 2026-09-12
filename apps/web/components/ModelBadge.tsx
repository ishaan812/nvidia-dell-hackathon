"use client";

import { useEffect, useState } from "react";

function shortName(name: string) {
  return name.replace(/:latest$/, "");
}

type Props = {
  name?: string;
  ok?: boolean;
};

export function ModelBadge({ name, ok = true }: Props) {
  const [label, setLabel] = useState(name ?? "");
  const [reachable, setReachable] = useState(ok);

  useEffect(() => {
    if (name) {
      setLabel(name);
      setReachable(ok);
      return;
    }
    let cancelled = false;
    fetch("/api/health")
      .then((res) => res.json())
      .then((data: { using?: string; model?: { ok?: boolean } }) => {
        if (cancelled) return;
        if (typeof data.using === "string" && data.using) setLabel(data.using);
        setReachable(data.model?.ok !== false);
      })
      .catch(() => {
        if (!cancelled) setReachable(false);
      });
    return () => {
      cancelled = true;
    };
  }, [name, ok]);

  if (!label && reachable) {
    return (
      <span className="app-chrome-model" aria-live="polite">
        model…
      </span>
    );
  }

  return (
    <span className="app-chrome-model" title={reachable ? label : "Ollama is not reachable"} aria-label={`Using ${label || "no model"}`}>
      {reachable ? shortName(label) : "ollama down"}
    </span>
  );
}
