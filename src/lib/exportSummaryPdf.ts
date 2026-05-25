/**
 * Render a branded "OverraPrep AI" summary PDF from markdown-ish text.
 * Diagonal watermark on every page + footer + cover header.
 * Lazy-loads jsPDF to keep the main bundle slim.
 */
export async function exportSummaryPdf(opts: {
  title: string;
  subtitle?: string;
  bodyMarkdown: string;
  authorLabel?: string;
  filename?: string;
}): Promise<void> {
  const { default: jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "a4" });

  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 56;
  const maxW = pageW - margin * 2;

  const drawChrome = (pageIdx: number, totalPages: number) => {
    // Diagonal gold watermark
    doc.saveGraphicsState?.();
    doc.setTextColor(212, 175, 55);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(72);
    (doc as any).setGState?.(new (doc as any).GState({ opacity: 0.08 }));
    doc.text("OverraPrep AI", pageW / 2, pageH / 2, {
      angle: -28,
      align: "center",
    });
    (doc as any).setGState?.(new (doc as any).GState({ opacity: 1 }));
    doc.restoreGraphicsState?.();

    // Header bar (only first page heavy)
    if (pageIdx === 0) {
      doc.setFillColor(212, 175, 55);
      doc.rect(0, 0, pageW, 6, "F");
    }

    // Footer
    doc.setFontSize(8);
    doc.setTextColor(120);
    doc.setFont("helvetica", "normal");
    doc.text("Generated with OverraPrep AI", margin, pageH - 22);
    doc.text(`Page ${pageIdx + 1} of ${totalPages}`, pageW - margin, pageH - 22, { align: "right" });
  };

  // Cover header
  let y = margin + 8;
  doc.setTextColor(20);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("OVERRAPREP AI · STUDY NOTES", margin, y);
  y += 22;

  doc.setFontSize(22);
  const titleLines = doc.splitTextToSize(opts.title || "Untitled", maxW);
  doc.text(titleLines, margin, y);
  y += titleLines.length * 24 + 4;

  if (opts.subtitle) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.setTextColor(110);
    const sub = doc.splitTextToSize(opts.subtitle, maxW);
    doc.text(sub, margin, y);
    y += sub.length * 14 + 8;
  }

  doc.setDrawColor(212, 175, 55);
  doc.setLineWidth(1);
  doc.line(margin, y, pageW - margin, y);
  y += 18;

  doc.setTextColor(35);

  const ensureSpace = (need: number) => {
    if (y + need > pageH - margin - 16) {
      doc.addPage();
      y = margin;
    }
  };

  const lines = (opts.bodyMarkdown || "").split("\n");
  for (const raw of lines) {
    const line = raw.replace(/\s+$/, "");
    if (!line.trim()) { y += 8; continue; }

    // Headings
    const h = /^(#{1,3})\s+(.*)$/.exec(line);
    if (h) {
      const level = h[1].length;
      const size = level === 1 ? 18 : level === 2 ? 14 : 12;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(size);
      doc.setTextColor(20);
      const wrapped = doc.splitTextToSize(h[2], maxW);
      ensureSpace(wrapped.length * (size + 4) + 8);
      y += level === 1 ? 6 : 4;
      doc.text(wrapped, margin, y);
      y += wrapped.length * (size + 4) + 4;
      doc.setFont("helvetica", "normal");
      doc.setTextColor(35);
      continue;
    }

    // Bullets
    const b = /^\s*[-*•]\s+(.*)$/.exec(line);
    if (b) {
      doc.setFontSize(11);
      const wrapped = doc.splitTextToSize(b[1], maxW - 14);
      ensureSpace(wrapped.length * 14 + 2);
      doc.setTextColor(212, 175, 55);
      doc.text("•", margin, y);
      doc.setTextColor(35);
      doc.text(wrapped, margin + 14, y);
      y += wrapped.length * 14 + 2;
      continue;
    }

    // Paragraph
    doc.setFontSize(11);
    const wrapped = doc.splitTextToSize(line, maxW);
    ensureSpace(wrapped.length * 14 + 4);
    doc.text(wrapped, margin, y);
    y += wrapped.length * 14 + 4;
  }

  // Pass 2: footer/watermark on every page
  const total = doc.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    drawChrome(i - 1, total);
  }

  const safe = (opts.filename || opts.title || "overraprep-notes")
    .replace(/[^\w.\-]+/g, "_")
    .slice(0, 80);
  doc.save(`${safe}.pdf`);
}