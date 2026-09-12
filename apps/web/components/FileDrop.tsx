"use client";

import { useState } from "react";
import type { FileRole } from "@/lib/diligence/types";

function canBeDeck(filename: string) {
  return /\.(pdf|pptx|ppt)$/i.test(filename);
}

export type StagedFile = {
  file: File;
  role: FileRole;
};

type Props = {
  id: string;
  label: string;
  hint: string;
  files: StagedFile[];
  onFiles: (files: StagedFile[]) => void;
  disabled?: boolean;
};

function merge(current: StagedFile[], incoming: FileList | File[]) {
  const next = [...current];
  for (const file of Array.from(incoming)) {
    if (!next.some((item) => item.file.name === file.name && item.file.size === file.size)) {
      next.push({ file, role: "room" });
    }
  }
  return next;
}

export function roleMap(files: StagedFile[]): Record<string, FileRole> {
  return Object.fromEntries(files.map((item) => [item.file.name, item.role]));
}

export function FileDrop({ id, label, hint, files, onFiles, disabled = false }: Props) {
  const [over, setOver] = useState(false);

  return (
    <div>
      <label
        htmlFor={id}
        className={`block cursor-pointer border border-dashed px-4 py-5 ${
          over ? "border-copper bg-white/4" : "border-white/25"
        } ${disabled ? "opacity-50" : ""}`}
        onDragOver={(event) => {
          event.preventDefault();
          if (!disabled) setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(event) => {
          event.preventDefault();
          setOver(false);
          if (!disabled) onFiles(merge(files, event.dataTransfer.files));
        }}
      >
        <span className="block text-[16px] text-paper">{label}</span>
        <span className="mt-1 block text-[14px] leading-6 text-paper/70">{hint}</span>
        <input
          id={id}
          type="file"
          multiple
          disabled={disabled}
          accept=".pdf,.pptx,.ppt,.xlsx,.xls,.docx,.doc,.csv"
          className="mt-4 block w-full text-[14px] text-paper file:mr-3 file:border-0 file:bg-paper file:px-3 file:py-1.5 file:text-ink"
          onChange={(event) => {
            if (event.target.files) onFiles(merge(files, event.target.files));
            event.target.value = "";
          }}
        />
      </label>
      {files.length > 0 ? (
        <ul className="mt-3" aria-label="Files ready to add">
          {files.map((item) => {
            const slides = canBeDeck(item.file.name);
            return (
              <li key={`${item.file.name}-${item.file.size}`} className="staged-file">
                <div className="min-w-0">
                  <p className="truncate text-[15px]">{item.file.name}</p>
                  <p className="mt-1 font-mono text-[11px] text-paper/45">
                    {slides
                      ? item.role === "deck"
                        ? "Will be reviewed as a deck"
                        : "Will stay in the data room"
                      : "Data room file"}
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-end gap-2">
                  {slides ? (
                    <div className="role-toggle" role="group" aria-label={`Place ${item.file.name}`}>
                      <button
                        type="button"
                        disabled={disabled}
                        aria-pressed={item.role === "room"}
                        onClick={() =>
                          onFiles(files.map((entry) => (entry === item ? { ...entry, role: "room" } : entry)))
                        }
                      >
                        Data room
                      </button>
                      <button
                        type="button"
                        disabled={disabled}
                        aria-pressed={item.role === "deck"}
                        onClick={() =>
                          onFiles(files.map((entry) => (entry === item ? { ...entry, role: "deck" } : entry)))
                        }
                      >
                        Deck
                      </button>
                    </div>
                  ) : (
                    <span className="role-pill">Data room</span>
                  )}
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => onFiles(files.filter((entry) => entry !== item))}
                    aria-label={`Remove ${item.file.name}`}
                    className="text-paper/70 underline-offset-2 hover:text-paper hover:underline"
                  >
                    Remove
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
