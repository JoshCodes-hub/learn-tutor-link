/**
 * Client-side text extraction for PDF / DOCX / TXT / MD files.
 * Reuses pdfjs-dist + mammoth which are already bundled in the project.
 */
export async function extractTextFromFile(file: File, opts?: { maxPages?: number }): Promise<string> {
  const maxPages = opts?.maxPages ?? 80;
  const name = file.name.toLowerCase();

  if (file.type === "application/pdf" || name.endsWith(".pdf")) {
    const pdfjs: any = await import("pdfjs-dist");
    pdfjs.GlobalWorkerOptions.workerSrc =
      `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
    const buf = await file.arrayBuffer();
    const pdf = await pdfjs.getDocument({ data: buf }).promise;
    const parts: string[] = [];
    const pages = Math.min(pdf.numPages, maxPages);
    for (let p = 1; p <= pages; p++) {
      const page = await pdf.getPage(p);
      const content = await page.getTextContent();
      // Heuristic structure preservation:
      // - Track y-positions to detect paragraph breaks (large vertical jumps).
      // - Track font heights to mark larger lines as headings.
      const items = (content.items || []).filter((it: any) => it && typeof it.str === "string" && it.str.trim().length);
      const heights = items.map((it: any) => Math.abs(it.transform?.[3] || it.height || 10));
      const medianH = heights.length ? heights.slice().sort((a, b) => a - b)[Math.floor(heights.length / 2)] : 10;
      let lastY: number | null = null;
      const lines: string[] = [];
      let buf = "";
      let bufIsHeading = false;
      const flush = () => {
        const t = buf.trim();
        if (!t) { buf = ""; bufIsHeading = false; return; }
        lines.push(bufIsHeading ? `# ${t}` : t);
        buf = ""; bufIsHeading = false;
      };
      for (const it of items as any[]) {
        const y = it.transform?.[5] ?? 0;
        const h = Math.abs(it.transform?.[3] || it.height || medianH);
        const isHeading = h >= medianH * 1.35;
        if (lastY !== null) {
          const dy = Math.abs(y - lastY);
          if (dy > medianH * 1.6) { flush(); lines.push(""); }
          else if (dy > medianH * 0.6) { flush(); }
        }
        if (isHeading && !bufIsHeading && buf.trim()) flush();
        if (isHeading) bufIsHeading = true;
        buf += (buf && !buf.endsWith(" ") ? " " : "") + it.str;
        lastY = y;
      }
      flush();
      parts.push(lines.join("\n"));
    }
    // Collapse only runs of inline whitespace; keep newlines intact.
    return parts.join("\n\n").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
  }

  if (
    name.endsWith(".docx") ||
    file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    const mammoth: any = await import("mammoth");
    const buf = await file.arrayBuffer();
    const res = await mammoth.extractRawText({ arrayBuffer: buf });
    return (res.value || "").replace(/\s+/g, " ").trim();
  }

  if (file.type.startsWith("text/") || name.endsWith(".txt") || name.endsWith(".md")) {
    const t = await file.text();
    return t.trim();
  }

  return "";
}

/** Detect a ResourceKind from a File's mime/extension. */
export function kindFromFile(file: File): "pdf" | "image" | "audio" | "note" {
  const t = file.type;
  const n = file.name.toLowerCase();
  if (t === "application/pdf" || n.endsWith(".pdf")) return "pdf";
  if (t.startsWith("image/")) return "image";
  if (t.startsWith("audio/")) return "audio";
  return "note"; // docx / txt / md / unknown text
}