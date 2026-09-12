import Link from "next/link";
import { notFound } from "next/navigation";
import { FilePreview } from "@/components/FilePreview";
import { previewFile } from "@/lib/diligence/evidence";
import { loadDeal } from "@/lib/diligence/store";

export const dynamic = "force-dynamic";

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
        <Link href={`/deals/${id}`} className="text-[15px] text-paper/75 underline-offset-2 hover:underline">
          Back to the data room
        </Link>
        <Link href={`/deals/${id}/deck`} className="text-[15px] text-paper/75 underline-offset-2 hover:underline">
          Back to the deck
        </Link>
      </div>
      <FilePreview fill preview={preview} href={href} />
    </div>
  );
}
