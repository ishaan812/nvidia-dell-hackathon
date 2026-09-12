"use client";

import { useEffect, useRef, useState } from "react";
import type { Flag } from "@/lib/diligence/types";

type Slide = {
  n: number;
  kicker: string;
  title: string;
  lines: string[];
  text: string;
};

type Props = {
  src: string;
  slides?: Slide[];
  flags?: Flag[];
  activeId?: string | null;
  onSelect?: (id: string) => void;
  compact?: boolean;
};

const FILL: Record<string, string> = {
  contradiction: "rgba(220, 38, 28, 0.28)",
  unsupported: "rgba(180, 120, 0, 0.28)",
  missing: "rgba(102, 112, 133, 0.28)",
};

const EDGE: Record<string, string> = {
  contradiction: "#b42318",
  unsupported: "#9a6700",
  missing: "#667085",
};

function lineHit(line: string, quote: string): boolean {
  if (!quote.trim()) return false;
  const a = line.toLowerCase().replace(/\s+/g, "");
  const b = quote.toLowerCase().replace(/\s+/g, "");
  return a.includes(b) || b.includes(a);
}

export function PptxViewer({ src, slides: initial, flags = [], activeId, onSelect, compact = false }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const [slides, setSlides] = useState<Slide[]>(initial ?? []);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initial?.length) {
      setSlides(initial);
      return;
    }
    let dead = false;
    setError(null);
    setSlides([]);
    void fetch(src)
      .then(async (res) => {
        const data = (await res.json()) as { slides?: Slide[]; error?: string };
        if (!res.ok) throw new Error(data.error || `Slides HTTP ${res.status}`);
        if (!dead) setSlides(data.slides ?? []);
      })
      .catch((err: Error) => {
        if (!dead) setError(err.message);
      });
    return () => {
      dead = true;
    };
  }, [src, initial]);

  useEffect(() => {
    if (!activeId) return;
    const flag = flags.find((item) => item.id === activeId);
    const page = flag?.page && flag.page > 0 ? flag.page : 1;
    const slide = document.getElementById(`slide-${page}`);
    const scroller = slide?.closest("main") ?? host.current?.closest(".preview-body, main, .room-desk-body");
    if (slide && scroller) {
      const top = slide.offsetTop - (scroller.clientHeight || 0) / 2 + slide.offsetHeight / 2;
      scroller.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
    }
  }, [activeId, flags, slides.length]);

  if (error) {
    return <p className="p-6 text-sm text-flag-red">Could not open these slides. {error}</p>;
  }
  if (!slides.length) {
    return <p className="p-6 font-mono text-[12px] text-black/45">Opening slides…</p>;
  }

  return (
    <div ref={host} className={`pptx-deck ${compact ? "is-compact" : ""}`}>
      {slides.map((slide) => {
        const pageFlags = flags.filter((flag) => (flag.page ?? 1) === slide.n);
        return (
          <section key={slide.n} id={`slide-${slide.n}`} className="pptx-slide">
            <p className="pptx-meta">
              <span>{slide.kicker || "Slide"}</span>
              <span>
                {slide.n} / {slides.length}
              </span>
            </p>
            <h2>{slide.title}</h2>
            <div className="pptx-body">
              {slide.lines.map((line, index) => {
                const flag = pageFlags.find((item) => lineHit(line, item.quote));
                if (!flag) {
                  return (
                    <p
                      key={`${slide.n}-${index}`}
                      className={/^\$?[\d.,]+\s*[bmk%]?$/i.test(line) ? "pptx-stat" : undefined}
                    >
                      {line}
                    </p>
                  );
                }
                return (
                  <button
                    key={`${slide.n}-${index}-${flag.id}`}
                    type="button"
                    className={`slide-hl pptx-hit ${activeId === flag.id ? "is-active" : ""}`}
                    data-flag-id={flag.id}
                    title={flag.comment}
                    style={{ background: FILL[flag.severity], outline: `2px solid ${EDGE[flag.severity]}` }}
                    onClick={() => onSelect?.(flag.id)}
                  >
                    {line}
                  </button>
                );
              })}
            </div>
            {pageFlags
              .filter((flag) => !flag.quote)
              .map((flag) => (
                <button
                  key={flag.id}
                  type="button"
                  className={`slide-hl pptx-note ${activeId === flag.id ? "is-active" : ""}`}
                  data-flag-id={flag.id}
                  title={flag.comment}
                  style={{ background: FILL[flag.severity], outline: `2px solid ${EDGE[flag.severity]}` }}
                  onClick={() => onSelect?.(flag.id)}
                >
                  {flag.comment}
                </button>
              ))}
            <p className="pptx-foot">Investor materials · Confidential</p>
          </section>
        );
      })}
    </div>
  );
}
