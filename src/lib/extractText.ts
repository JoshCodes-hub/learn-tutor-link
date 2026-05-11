/**
 * Client-side text extraction for PDF / DOCX / TXT / MD files.
 * Reuses pdfjs-dist + mammoth which are already bundled in the project.
 */
export async function extractTextFromFile(file: File, opts?: { maxPages?: number }): Promise<string> {
  const maxPages = opts?.maxPages ?? 40;
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
      parts.push(content.items.map((it: any) => it.str).join(" "));
    }
    return parts.join("\n\n").replace(/\s+/g, " ").trim();
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