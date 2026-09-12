import type { Metadata } from "next";
import { readFile } from "node:fs/promises";
import { notFound } from "next/navigation";
import { BrandLogo } from "@/components/BrandLogo";
import { FilePreview } from "@/components/FilePreview";
import { ModelBadge } from "@/components/ModelBadge";
import { PptxViewer } from "@/components/PptxViewer";
import { resolveDealSource, previewFile } from "@/lib/diligence/evidence";
import { settings } from "@/lib/diligence/paths";
import { parsePptx } from "@/lib/diligence/pptx";
import { loadDeal } from "@/lib/diligence/store";
import { readWorkbookGrid } from "@/lib/diligence/workbook";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ name?: string }>;
}): Promise<Metadata> {
  const { name } = await searchParams;
  return { title: name || "Preview" };
}

export default async function FilePreviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ name?: string }>;
}) {
  const { id } = await params;
  const { name } = await searchParams;
  const deal = await loadDeal(id);
  if (!deal || !name) notFound();
  const preview = await previewFile(deal, name);
  if (!preview) notFound();
  const href = `/api/deals/${id}/file?name=${encodeURIComponent(name)}`;
  const file = resolveDealSource(deal, name);
  const grid =
    file && /\.(xlsx?|csv)$/i.test(name) ? await readWorkbookGrid(file, name).catch(() => null) : null;
  const slides =
    file && /\.pptx$/i.test(name) ? await parsePptx(await readFile(file)).catch(() => undefined) : undefined;

  return (
    <div className="preview-page">
      <div className="preview-page-bar">
        <BrandLogo compact size={18} />
        <div className="flex items-center gap-5">
          <ModelBadge name={settings().llmModel} />
          <a href={`/deals/${id}`} target="_top" className="text-[15px] text-paper/75 underline-offset-2 hover:underline">
            Back to the data room
          </a>
          <a
            href={`/deals/${id}/deck`}
            target="_top"
            className="text-[15px] text-paper/75 underline-offset-2 hover:underline"
          >
            Back to the deck
          </a>
        </div>
      </div>
      {slides?.length ? <PptxViewer src={`/api/deals/${id}/slides?name=${encodeURIComponent(name)}`} slides={slides} /> : null}
      <FilePreview fill preview={preview} href={href} grid={grid} />
    </div>
  );
}
