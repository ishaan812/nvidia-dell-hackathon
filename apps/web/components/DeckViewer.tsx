"use client";

import { useEffect, useRef, useState } from "react";
import type { Flag } from "@/lib/diligence/types";
import { clipFactor, findRunIndexes } from "@/lib/diligence/textMatch";

type Props = {
  src: string;
  flags: Flag[];
  activeId?: string | null;
  onPage?: (page: number) => void;
  onSelect?: (id: string) => void;
};

const FILL: Record<string, string> = {
  contradiction: "rgba(180, 35, 24, 0.32)",
  unsupported: "rgba(154, 103, 0, 0.32)",
  missing: "rgba(102, 112, 133, 0.28)",
};

const EDGE: Record<string, string> = {
  contradiction: "#b42318",
  unsupported: "#9a6700",
  missing: "#667085",
};

export function DeckViewer({ src, flags, activeId, onPage, onSelect }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const flagsRef = useRef(flags);
  const onSelectRef = useRef(onSelect);
  flagsRef.current = flags;
  onSelectRef.current = onSelect;
  const flagKey = flags.map((flag) => `${flag.id}:${flag.page}:${flag.quote}`).join("|");
  const [status, setStatus] = useState<"loading" | "ready" | "fallback" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let dead = false;
    async function render() {
      if (!host.current) return;
      host.current.innerHTML = "";
      setStatus("loading");
      setMessage("");
      try {
        const res = await fetch(src);
        if (!res.ok) throw new Error(`Deck HTTP ${res.status}`);
        const bytes = new Uint8Array(await res.arrayBuffer());
        if (bytes.byteLength < 5 || String.fromCharCode(...bytes.slice(0, 4)) !== "%PDF") {
          throw new Error("Response was not a PDF");
        }
        const pdfjs = await import("pdfjs-dist");
        pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
        const pdf = await pdfjs.getDocument({ data: bytes.slice() }).promise;
        for (let n = 1; n <= pdf.numPages; n++) {
          if (dead) return;
          const page = await pdf.getPage(n);
          const viewport = page.getViewport({ scale: 1.25 });
          const wrap = document.createElement("section");
          wrap.id = `slide-${n}`;
          wrap.className = "relative mb-6 overflow-hidden bg-[#f3eee4] shadow-sm";
          const canvas = document.createElement("canvas");
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          canvas.className = "block h-auto w-full";
          wrap.appendChild(canvas);
          const overlay = document.createElement("div");
          overlay.className = "pointer-events-none absolute inset-0";
          wrap.appendChild(overlay);
          const label = document.createElement("div");
          label.className = "absolute right-3 top-3 z-10 font-mono text-[11px] text-black/45";
          label.textContent = `${n} / ${pdf.numPages}`;
          wrap.appendChild(label);
          host.current.appendChild(wrap);
          const ctx = canvas.getContext("2d");
          if (!ctx) throw new Error("Canvas unavailable");
          await page.render({ canvasContext: ctx, viewport, canvas }).promise;

          const content = await page.getTextContent();
          const runs = content.items.filter(
            (item): item is typeof item & { str: string; transform: number[]; width: number } => "str" in item,
          );
          const pageFlags = flagsRef.current.filter((flag) => flag.page === n);
          for (const flag of pageFlags) {
            const indexes = findRunIndexes(runs, flag.quote);
            const boxes = indexes.map((i) => {
              const run = runs[i];
              const tx = pdfjs.Util.transform(viewport.transform, run.transform);
              const height = Math.hypot(tx[2], tx[3]) || 18;
              const full = (run.width || 40) * viewport.scale;
              const clip = clipFactor(run.str, flag.quote);
              return {
                x: tx[4] + full * clip.start,
                y: tx[5] - height - 4,
                w: Math.max(40, full * (clip.end - clip.start) + 8),
                h: height * 1.45 + 8,
              };
            });
            if (!boxes.length) {
              boxes.push({
                x: viewport.width * 0.06,
                y: viewport.height * 0.28,
                w: viewport.width * 0.42,
                h: 48,
              });
            }
            const open = () => onSelectRef.current?.(flag.id);
            for (const box of boxes) {
              const mark = document.createElement("button");
              mark.type = "button";
              mark.className = "slide-hl";
              mark.dataset.flagId = flag.id;
              mark.title = flag.comment;
              mark.style.left = `${(box.x / viewport.width) * 100}%`;
              mark.style.top = `${(box.y / viewport.height) * 100}%`;
              mark.style.width = `${(box.w / viewport.width) * 100}%`;
              mark.style.height = `${(box.h / viewport.height) * 100}%`;
              mark.style.background = FILL[flag.severity];
              mark.style.outline = `2px solid ${EDGE[flag.severity]}`;
              mark.addEventListener("click", (event) => {
                event.stopPropagation();
                open();
              });
              overlay.appendChild(mark);
            }
          }
        }
        if (!dead) setStatus("ready");
      } catch (error) {
        if (dead) return;
        setMessage((error as Error).message);
        setStatus("fallback");
      }
    }
    void render();
    return () => {
      dead = true;
    };
  }, [src, flagKey]);

  useEffect(() => {
    if (status !== "ready") return;
    const marks = host.current?.querySelectorAll<HTMLElement>("[data-flag-id]") ?? [];
    marks.forEach((el) => {
      el.classList.toggle("is-active", el.dataset.flagId === activeId);
    });
    const flag = flags.find((item) => item.id === activeId);
    if (!flag?.page) return;
    const slide = document.getElementById(`slide-${flag.page}`);
    const scroller = slide?.closest("main");
    if (slide && scroller) {
      const top = slide.offsetTop - scroller.clientHeight / 2 + slide.offsetHeight / 2;
      scroller.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
    }
    onPage?.(flag.page);
  }, [activeId, flags, onPage, status]);

  if (status === "error") {
    return <p className="p-6 text-sm text-flag-red">Could not render the deck. {message}</p>;
  }

  return (
    <div className="px-6 py-6">
      {status === "loading" ? (
        <p className="mb-4 font-mono text-[12px] text-black/50">Rendering slides…</p>
      ) : null}
      {status === "fallback" ? (
        <div className="mb-4">
          <p className="mb-2 font-mono text-[12px] text-black/55">
            Canvas viewer failed ({message}). Showing the file instead.
          </p>
          <iframe title="Deck" src={src} className="h-[70vh] w-full border-0 bg-white" />
        </div>
      ) : null}
      <div ref={host} />
    </div>
  );
}
