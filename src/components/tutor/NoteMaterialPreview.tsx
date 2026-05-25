import { useEffect, useState } from "react";
import { ImageIcon, Loader2 } from "lucide-react";
import { getTutorMaterialSignedUrl, type TutorMaterial } from "@/hooks/useTutorCurricula";

interface NoteImageMeta {
  path: string;
  mime?: string;
  size?: number;
  name?: string;
}

interface Props {
  material: TutorMaterial;
  /** When true, render a smaller compact preview suited to dense lists. */
  compact?: boolean;
}

/**
 * Renders a tutor "note" material inline:
 *  - the note body (content_text) truncated to ~6 lines, expandable
 *  - thumbnail strip for any meta.images[] uploaded with the note
 * Images are loaded lazily via signed URLs from the tutor-materials bucket.
 */
export function NoteMaterialPreview({ material, compact }: Props) {
  const images: NoteImageMeta[] = Array.isArray((material.meta as any)?.images)
    ? (material.meta as any).images
    : [];
  const text = material.content_text || "";

  const [expanded, setExpanded] = useState(false);
  const [urls, setUrls] = useState<(string | null)[]>([]);
  const [loadingImgs, setLoadingImgs] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!images.length) return;
    setLoadingImgs(true);
    Promise.all(images.map((i) => getTutorMaterialSignedUrl(i.path, 3600))).then((res) => {
      if (!cancelled) {
        setUrls(res);
        setLoadingImgs(false);
      }
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [material.id]);

  if (!text && images.length === 0) return null;

  return (
    <div className={compact ? "mt-1.5 space-y-2" : "mt-2 space-y-2"}>
      {text && (
        <div className="rounded-lg bg-amber-50/60 border border-amber-200/60 p-2.5">
          <p
            className={`text-[12px] leading-relaxed text-foreground/90 whitespace-pre-wrap ${
              expanded ? "" : "line-clamp-6"
            }`}
          >
            {text}
          </p>
          {text.split("\n").length > 6 || text.length > 320 ? (
            <button
              onClick={() => setExpanded((e) => !e)}
              className="mt-1 text-[11px] font-semibold text-amber-700 hover:underline"
            >
              {expanded ? "Show less" : "Read more"}
            </button>
          ) : null}
        </div>
      )}
      {images.length > 0 && (
        <div className="space-y-1">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold flex items-center gap-1">
            <ImageIcon className="w-3 h-3" /> Images ({images.length})
          </p>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5">
            {images.map((img, i) => {
              const url = urls[i];
              return (
                <a
                  key={i}
                  href={url || "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => { if (!url) e.preventDefault(); }}
                  className="relative aspect-square rounded-md overflow-hidden border border-amber-200/60 bg-muted/40 group"
                  title={img.name || `Image ${i + 1}`}
                >
                  {url ? (
                    <img
                      src={url}
                      alt={img.name || `Image ${i + 1}`}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      {loadingImgs ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
                      ) : (
                        <ImageIcon className="w-4 h-4 text-muted-foreground" />
                      )}
                    </div>
                  )}
                </a>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}