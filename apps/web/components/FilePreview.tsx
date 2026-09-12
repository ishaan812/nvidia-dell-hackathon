"use client";

import type { SourcePreview } from "@/lib/diligence/types";
import { NativePdf } from "./NativePdf";
import { PptxViewer } from "./PptxViewer";
import { WordViewer } from "./WordViewer";
import { WorkbookViewer } from "./WorkbookViewer";

type Props = {
  preview: SourcePreview;
  href?: string;
  openHref?: string;
  compact?: boolean;
  fill?: boolean;
  onClose?: () => void;
};

export function FilePreview({ preview, href, openHref, compact = false, fill = false, onClose }: Props) {
  const open = openHref ?? href;
  const isPdf = /\.pdf$/i.test(preview.filename);
  const isPptx = /\.pptx$/i.test(preview.filename);
  const isGrid = /\.(xlsx?|csv)$/i.test(preview.filename);
  const isDoc = /\.docx$/i.test(preview.filename);
  const native = Boolean(href) && (isPdf || isGrid || isPptx);
  const slidesHref = href?.replace("/file?", "/slides?");

  return (
    <div className={`source-file ${fill ? "is-fill" : ""}`}>
      <div className="source-toolbar">
        <p className="source-name">
          {preview.filename}
          {preview.sheet ? <span className="source-sheet"> · {preview.sheet}</span> : null}
        </p>
        <div className="source-actions">
          {open ? (
            <a href={open} target="_blank" rel="noreferrer" className="source-open">
              Open in new tab
            </a>
          ) : null}
          {href ? (
            <a href={href} className="source-download">
              Download
            </a>
          ) : null}
          {onClose ? (
            <button type="button" className="source-download" onClick={onClose}>
              Close
            </button>
          ) : null}
        </div>
      </div>

      <div className="preview-body">
        {isPdf && href ? <NativePdf src={href} fill={fill} title={preview.filename} /> : null}
        {isPptx && slidesHref ? <PptxViewer src={slidesHref} compact={compact} /> : null}
        {isGrid && href ? (
          <WorkbookViewer
            href={href}
            highlight={preview.highlight}
            sheet={preview.sheet}
            compact={compact}
          />
        ) : null}
        {isDoc ? (
          <WordViewer html={preview.html} paragraphs={preview.paragraphs} compact={compact} />
        ) : null}
        {!native && !isDoc && (preview.kind === "text" || preview.paragraphs?.length) ? (
          <div className="source-doc">
            {(preview.paragraphs?.length ? preview.paragraphs : preview.excerpt ? [preview.excerpt] : []).map(
              (paragraph, index) => (
                <p key={`${index}-${paragraph.slice(0, 24)}`}>{paragraph}</p>
              ),
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
