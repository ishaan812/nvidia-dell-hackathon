import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { addFilesToDeal } from "@/lib/diligence/pipeline";
import { dirs } from "@/lib/diligence/paths";
import { parseRoles } from "@/lib/diligence/roles";
import { loadDeal } from "@/lib/diligence/store";

export const maxDuration = 300;

function safeName(name: string) {
  return path.basename(name).replace(/[^\w.\- ()]+/g, "-");
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const deal = await loadDeal(id);
    if (!deal) return NextResponse.json({ error: "Deal not found" }, { status: 404 });

    const form = await request.formData();
    const files = form.getAll("files").filter((item): item is File => item instanceof File && item.size > 0);
    if (!files.length) return NextResponse.json({ error: "Choose at least one file" }, { status: 400 });
    const roles = parseRoles(form.get("roles"));

    const folder = path.join(dirs().staging, `add-${id}-${Date.now()}`);
    await mkdir(folder, { recursive: true });
    let saved = 0;
    for (const file of files) {
      const name = safeName(file.name);
      if (!name || name === "." || name === "..") continue;
      await writeFile(path.join(folder, name), Buffer.from(await file.arrayBuffer()));
      saved += 1;
    }
    if (!saved) return NextResponse.json({ error: "Those file names were not usable" }, { status: 400 });

    const next = await addFilesToDeal(deal, folder, roles);
    return NextResponse.json({
      id: next.id,
      status: next.status,
      files: next.docs.map((doc) => doc.filename),
      decks: next.deckFilenames ?? [],
    });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message || "Could not add those files" },
      { status: 500 },
    );
  }
}
