import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { dirs } from "@/lib/diligence/paths";
import { runDeal } from "@/lib/diligence/pipeline";
import { parseRoles } from "@/lib/diligence/roles";

export const maxDuration = 300;

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const files = form.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);
    if (!files.length) return NextResponse.json({ error: "Choose at least one file" }, { status: 400 });
    const name = String(form.get("name") || files[0].name.replace(/\.[^.]+$/, "") || "deal");
    const roles = parseRoles(form.get("roles"));
    const folder = path.join(dirs().staging, `upload-${name.replace(/[^\w.-]+/g, "-")}-${Date.now()}`);
    await mkdir(folder, { recursive: true });
    for (const file of files) {
      const safe = path.basename(file.name).replace(/[^\w.\- ()]+/g, "-");
      if (!safe || safe === "." || safe === "..") continue;
      await writeFile(path.join(folder, safe), Buffer.from(await file.arrayBuffer()));
    }
    const deal = await runDeal(folder, name, roles);
    return NextResponse.json({ id: deal.id, status: deal.status, decks: deal.deckFilenames ?? [] });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message || "Could not start this deal" },
      { status: 500 },
    );
  }
}
