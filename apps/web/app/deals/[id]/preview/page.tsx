import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BrandLogo } from "@/components/BrandLogo";
import { FilePreview } from "@/components/FilePreview";
import { ModelBadge } from "@/components/ModelBadge";
import { settings } from "@/lib/diligence/paths";
import { previewFile } from "@/lib/diligence/evidence";
import { loadDeal } from "@/lib/diligence/store";

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

  return (
    <div className="preview-page">
      <div className="preview-page-bar">
        <BrandLogo compact size={18} />
        <div className="flex items-center gap-5">
          <ModelBadge name={settings().llmModel} />
          <Link href={`/deals/${id}`} className="text-[15px] text-paper/75 underline-offset-2 hover:underline">
            Back to the data room
          </Link>
          <Link href={`/deals/${id}/deck`} className="text-[15px] text-paper/75 underline-offset-2 hover:underline">
            Back to the deck
          </Link>
        </div>
      </div>
      <FilePreview fill preview={preview} href={href} />
    </div>
  );
}
