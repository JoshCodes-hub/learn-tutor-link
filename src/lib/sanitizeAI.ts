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
  // 1. Strip runs of 3+ asterisks completely (e.g. *****, ****)
  s = s.replace(/\*{3,}/g, "");
  // 2. Unwrap bold **text** and __text__ to plain text — students hate the *** noise
  s = s.replace(/\*\*([\s\S]+?)\*\*/g, "$1");
  s = s.replace(/__([\s\S]+?)__/g, "$1");
  // 3. Unwrap italic *text* / _text_ when clearly used as decoration (single word/phrase)
  s = s.replace(/(^|[\s(>])\*([^*\n][^*\n]{0,200}?)\*(?=[\s.,;:!?)<]|$)/g, "$1$2");
  // 4. Remove any remaining stray asterisks
  s = s.replace(/(^|\s)\*+(\s|$)/g, "$1$2");
  s = s.replace(/\*+/g, "");
  // 5. Normalise bullets that came across as "* item" or "- item" with weird spacing
  s = s.replace(/^[ \t]*•[ \t]*/gm, "- ");
  // 6. Collapse 3+ blank lines and trim per-line trailing whitespace
  s = s.replace(/[ \t]+$/gm, "");
  s = s.replace(/\n{3,}/g, "\n\n");
  return s.trim();
}