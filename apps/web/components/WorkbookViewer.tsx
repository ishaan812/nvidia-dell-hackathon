"use client";

import { useEffect, useRef, useState } from "react";
import type { WorkbookGrid, WorkbookSheet } from "@/lib/diligence/types";

type Props = {
  href: string;
  highlight?: string;
  sheet?: string;
  compact?: boolean;
  grid?: WorkbookGrid | null;
};

function colLetter(index: number) {
  let n = index + 1;
  let out = "";
  while (n > 0) {
    const rem = (n - 1) % 26;
    out = String.fromCharCode(65 + rem) + out;
    n = Math.floor((n - 1) / 26);
  }
  return out;
}

function parseHumanNumber(value: string): number | null {
  const match = value
    .trim()
    .toLowerCase()
    .replace(/[$,]/g, "")
    .match(/(-?\d+(?:\.\d+)?)\s*(b|m|k|%)?/);
  if (!match) return null;
  let n = Number(match[1]);
  if (!Number.isFinite(n)) return null;
  if (match[2] === "b") n *= 1_000_000_000;
  if (match[2] === "m") n *= 1_000_000;
  if (match[2] === "k") n *= 1_000;
  return n;
}

function mainlyANumber(value: string): boolean {
  return /^\$?-?[\d,]+(?:\.\d+)?\s*(?:[bmk]|%|months?|people|mo)?$/i.test(value.trim());
}

function approx(a: number, b: number): boolean {
  return Math.abs(a - b) <= 0.51;
}

export function numbersMatch(cell: string, highlight: string): boolean {
  if (!cell || !highlight) return false;
  const text = cell.toLowerCase();
  const needle = highlight.toLowerCase();
  if (text.includes(needle) || (needle.length > 2 && needle.includes(text) && mainlyANumber(cell))) {
    return true;
  }
  const cellNum = parseHumanNumber(cell);
  const want = parseHumanNumber(highlight);
  if (cellNum == null || want == null || !mainlyANumber(cell)) return false;
  if (approx(cellNum, want)) return true;
  if (cellNum <= 1 && want > 1 && approx(cellNum * 100, want)) return true;
  if (want <= 1 && cellNum > 1 && approx(want * 100, cellNum)) return true;
  return false;
}

function sheetHasHit(sheet: WorkbookSheet, highlight?: string): boolean {
  if (!highlight) return false;
  return sheet.rows.some((row) => row.cells.some((cell) => numbersMatch(cell.text, highlight)));
}

export function WorkbookViewer({ href, highlight, sheet, compact = false, grid: initial }: Props) {
  const [grid, setGrid] = useState<WorkbookGrid | null>(initial ?? null);
  const [sheetName, setSheetName] = useState(sheet ?? "");
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const workbookHref = href.replace("/file?", "/workbook?");

  useEffect(() => {
    function pickSheet(data: WorkbookGrid) {
      const named = sheet && data.sheets.find((item) => item.name === sheet);
      const marked = highlight ? data.sheets.find((item) => sheetHasHit(item, highlight)) : undefined;
      setSheetName(named?.name ?? marked?.name ?? data.sheets[0]?.name ?? "");
    }
    if (initial) {
      setGrid(initial);
      pickSheet(initial);
      return;
    }
    let dead = false;
    setGrid(null);
    setError(null);
    void fetch(workbookHref)
      .then(async (res) => {
        const data = (await res.json()) as WorkbookGrid & { error?: string };
        if (!res.ok) throw new Error(data.error || "Could not open workbook");
        if (!dead) {
          setGrid(data);
          pickSheet(data);
        }
      })
      .catch((err: Error) => {
        if (!dead) setError(err.message);
      });
    return () => {
      dead = true;
    };
  }, [workbookHref, sheet, highlight, initial]);

  const current: WorkbookSheet | undefined =
    grid?.sheets.find((item) => item.name === sheetName) ?? grid?.sheets[0];

  useEffect(() => {
    const node = scrollRef.current?.querySelector(".xl-hit-cell");
    node?.scrollIntoView({ block: "center", inline: "nearest" });
  }, [current, highlight]);

  if (error) return <p className="xl-error">{error}</p>;
  if (!current) return <p className="xl-error">Opening workbook…</p>;

  return (
    <div className={`xl-app ${compact ? "is-compact" : ""}`}>
      <div className="xl-formula" aria-hidden="true">
        <span>fx</span>
        <span>{current.name}</span>
      </div>
      <div className="xl-scroll" ref={scrollRef}>
        <table>
          <colgroup>
            <col style={{ width: 36 }} />
            {current.columns.map((column, index) => (
              <col key={colLetter(index)} style={{ width: Math.max(64, column.width) }} />
            ))}
          </colgroup>
          <thead>
            <tr>
              <th className="xl-corner" />
              {current.columns.map((_, index) => (
                <th key={colLetter(index)} className="xl-colh">
                  {colLetter(index)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {current.rows.map((row, rowIndex) => {
              const hits = row.cells.map((cell) => Boolean(highlight) && numbersMatch(cell.text, highlight));
              const rowHit = hits.some(Boolean);
              return (
                <tr key={`r${rowIndex + 1}`} className={rowHit ? "xl-hit" : undefined}>
                  <th className="xl-rowh">{rowIndex + 1}</th>
                  {row.cells.map((cell, cellIndex) => (
                    <td
                      key={`${rowIndex}-${cellIndex}`}
                      className={hits[cellIndex] ? "xl-hit-cell" : undefined}
                      style={{
                        textAlign: cell.align,
                        fontWeight: cell.bold ? 600 : undefined,
                        background: hits[cellIndex] ? undefined : cell.fill,
                      }}
                    >
                      {cell.text}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="xl-tabs" role="tablist" aria-label="Sheets">
        {grid.sheets.map((item) => (
          <button
            key={item.name}
            type="button"
            role="tab"
            aria-selected={item.name === current.name}
            className={item.name === current.name ? "is-on" : ""}
            onClick={() => setSheetName(item.name)}
          >
            {item.name}
          </button>
        ))}
      </div>
    </div>
  );
}
