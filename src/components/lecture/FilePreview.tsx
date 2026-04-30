import { useEffect, useRef, useState } from "react";
import { FileText, FileImage, Presentation, FileType2, Loader2 } from "lucide-react";

interface Props {
  file: File;
  onThumbnailReady?: (blob: Blob | null) => void;
}

/**
 * Renders a preview of the selected file before publishing.
 * - Images: shows the image
 * - PDFs: renders first page as a thumbnail using pdfjs-dist
 * - DOCX/PPTX/other: shows a typed icon card
 * Calls onThumbnailReady with a PNG blob (image or PDF page-1) when available.
 */
export default function FilePreview({ file, onThumbnailReady }: Props) {
  const [imgUrl, setImgUrl] = useState<string | null>(null);
  const [pdfThumb, setPdfThumb] = useState<string | null>(null);
  const [pageCount, setPageCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const isImage = file.type.startsWith("image/");
  const isPdf = file.type === "application/pdf" || /\.pdf$/i.test(file.name);
  const isPpt = /presentation|powerpoint/.test(file.type) || /\.(ppt|pptx)$/i.test(file.name);
  const isDoc = /word|msword/.test(file.type) || /\.(doc|docx)$/i.test(file.name);

  useEffect(() => {
    setImgUrl(null);
    setPdfThumb(null);
    setPageCount(null);
    setError(null);

    if (isImage) {
      const url = URL.createObjectURL(file);
      setImgUrl(url);
      // Re-encode small thumbnail
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const max = 480;
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext("2d")?.drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((b) => onThumbnailReady?.(b), "image/png", 0.85);
      };
      img.src = url;
      return () => URL.revokeObjectURL(url);
    }

    if (isPdf) {
      let cancelled = false;
      setLoading(true);
      (async () => {
        try {
          const pdfjs: any = await import("pdfjs-dist");
          // Use module worker shipped by pdfjs-dist v5 to avoid worker URL hassles
          const workerSrc = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default;
          pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;
          const buf = await file.arrayBuffer();
          const pdf = await pdfjs.getDocument({ data: buf }).promise;
          if (cancelled) return;
          setPageCount(pdf.numPages);
          const page = await pdf.getPage(1);
          const viewport = page.getViewport({ scale: 1 });
          const targetWidth = 480;
          const scale = targetWidth / viewport.width;
          const scaled = page.getViewport({ scale });
          const canvas = canvasRef.current ?? document.createElement("canvas");
          canvas.width = Math.floor(scaled.width);
          canvas.height = Math.floor(scaled.height);
          const ctx = canvas.getContext("2d")!;
          await page.render({ canvasContext: ctx, viewport: scaled, canvas }).promise;
          if (cancelled) return;
          setPdfThumb(canvas.toDataURL("image/png"));
          canvas.toBlob((b) => onThumbnailReady?.(b), "image/png", 0.85);
        } catch (e: any) {
          console.error("PDF preview failed", e);
          setError("Couldn't render PDF preview");
          onThumbnailReady?.(null);
        } finally {
          if (!cancelled) setLoading(false);
        }
      })();
      return () => {
        cancelled = true;
      };
    }

    onThumbnailReady?.(null);
  }, [file]);

  const sizeLabel = file.size < 1024 * 1024
    ? `${(file.size / 1024).toFixed(0)} KB`
    : `${(file.size / 1024 / 1024).toFixed(1)} MB`;

  const TypeIcon = isPpt ? Presentation : isDoc ? FileType2 : FileText;
  const typeLabel = isImage
    ? "Image"
    : isPdf
    ? `PDF${pageCount ? ` · ${pageCount} page${pageCount > 1 ? "s" : ""}` : ""}`
    : isPpt
    ? "PowerPoint"
    : isDoc
    ? "Word document"
    : (file.type || "File");

  return (
    <div className="rounded-xl border bg-muted/30 p-3">
      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
        <span className="font-medium text-foreground truncate flex-1">{file.name}</span>
        <span className="shrink-0">{sizeLabel}</span>
      </div>
      <div className="flex items-center gap-3 text-xs mb-3">
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 text-amber-800 px-2 py-0.5">
          <TypeIcon className="w-3 h-3" /> {typeLabel}
        </span>
        <span className="text-muted-foreground">Confirm this is what you want to publish.</span>
      </div>

      <div className="relative w-full max-h-72 overflow-hidden rounded-lg bg-white border flex items-center justify-center min-h-[140px]">
        {loading && (
          <div className="flex items-center gap-2 text-muted-foreground py-10">
            <Loader2 className="w-4 h-4 animate-spin" /> Generating preview…
          </div>
        )}
        {!loading && isImage && imgUrl && (
          <img src={imgUrl} alt="Preview" className="max-h-72 w-auto object-contain" />
        )}
        {!loading && isPdf && pdfThumb && (
          <img src={pdfThumb} alt="PDF page 1 preview" className="max-h-72 w-auto object-contain" />
        )}
        {!loading && !isImage && !isPdf && (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <TypeIcon className="w-12 h-12 mb-2 text-amber-500" />
            <p className="text-sm font-medium text-foreground">{typeLabel}</p>
            <p className="text-xs">No inline preview — students will download to open.</p>
          </div>
        )}
        {!loading && error && (
          <p className="text-xs text-destructive p-3">{error}</p>
        )}
      </div>
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
