import { watch } from "chokidar";
import { existsSync } from "node:fs";
import { stat } from "node:fs/promises";
import path from "node:path";
import { dirs } from "./paths";
import { runDeal } from "./pipeline";

const seen = new Set<string>();
let started = false;

async function maybeRun(target: string) {
  const abs = path.resolve(target);
  if (seen.has(abs)) return;
    const name = path.basename(abs);
    if (abs.includes(`${path.sep}.`) || name.startsWith("add-") || name.startsWith("upload-")) return;
    try {
      const info = await stat(abs);
      if (!info.isDirectory()) return;
      if (path.resolve(abs) === path.resolve(dirs().inbox)) return;
      seen.add(abs);
      await runDeal(abs, path.basename(abs));
  } catch (error) {
    console.error("inbox deal failed", abs, error);
  }
}

export function startInboxWatch() {
  if (started) return;
  started = true;
  const inbox = dirs().inbox;
  const watcher = watch(inbox, {
    ignoreInitial: false,
    depth: 1,
    awaitWriteFinish: { stabilityThreshold: 1500, pollInterval: 300 },
  });
  watcher.on("addDir", (dir) => {
    if (path.resolve(dir) !== path.resolve(inbox)) void maybeRun(dir);
  });
  setInterval(async () => {
    const { readdir } = await import("node:fs/promises");
    if (!existsSync(inbox)) return;
    for (const name of await readdir(inbox)) {
      const full = path.join(inbox, name);
      const info = await stat(full).catch(() => null);
      if (info?.isDirectory()) void maybeRun(full);
    }
  }, 5000).unref();
}
