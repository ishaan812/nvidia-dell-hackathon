import { cp, mkdir, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { dirs } from "./paths";
import type { DealSandbox } from "./types";

export function dealRoot(dealId: string) {
  return path.resolve(dirs().data, dealId);
}

export function assertInsideDeal(dealId: string, filePath: string): string {
  const root = dealRoot(dealId);
  const resolved = path.resolve(filePath);
  if (resolved !== root && !resolved.startsWith(root + path.sep)) {
    throw new Error("Path is outside this deal's room");
  }
  return resolved;
}

export async function copyInto(source: string, dest: string) {
  const info = await stat(source);
  await mkdir(dest, { recursive: true });
  if (info.isFile()) {
    await cp(source, path.join(dest, path.basename(source)));
    return;
  }
  const entries = await readdir(source, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name.startsWith(".")) continue;
    await cp(path.join(source, entry.name), path.join(dest, entry.name), {
      recursive: true,
      dereference: true,
    });
  }
}

export async function addToWorkspace(workspace: string, incomingPath: string) {
  await copyInto(incomingPath, workspace);
}

export async function isolateDeal(dealId: string, sourcePath: string): Promise<DealSandbox> {
  const root = dealRoot(dealId);
  const workspace = path.join(root, "workspace");
  const source = path.resolve(sourcePath);
  const dataRoot = path.resolve(dirs().data);

  if (source.startsWith(dataRoot + path.sep) && !source.startsWith(root + path.sep)) {
    throw new Error("Refusing to copy files from another deal");
  }

  await copyInto(source, workspace);
  return { kind: "local", root, workspace };
}
