/**
 * Light cleanup for AI/LLM responses before rendering.
 * - Strips redundant *** and ** decorations students complained about ("don't show *****")
 * - Collapses 3+ consecutive newlines
 * - Trims trailing whitespace
 *
 * We deliberately keep single * (italic) and proper markdown headings/lists
 * intact so ReactMarkdown can render them nicely.
 */
export function sanitizeAIText(input: string | null | undefined): string {
  if (!input) return "";
  let s = String(input);
  // Remove runs of 3+ asterisks completely (e.g. *****, ****)
  s = s.replace(/\*{3,}/g, "");
  // Remove bold wrappers **text** -> text  (keep the text; drop the noise)
  s = s.replace(/\*\*(.+?)\*\*/g, "$1");
  // Strip leftover stray ** at line starts/ends
  s = s.replace(/(^|\s)\*\*(\s|$)/g, "$1$2");
  // Collapse excessive blank lines
  s = s.replace(/\n{3,}/g, "\n\n");
  return s.trim();
}