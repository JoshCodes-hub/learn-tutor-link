/**
 * Strip markdown / code / bullet decorations so on-device TTS doesn't try to
 * pronounce characters like "**", "##", "/", "~~", emoji squares, etc.
 * Keeps regular punctuation that helps pacing (. , ; : ? !).
 */
export function sanitizeForTts(input: string | null | undefined): string {
  if (!input) return "";
  let s = String(input);

  // Code fences / inline code
  s = s.replace(/```[\s\S]*?```/g, " ");
  s = s.replace(/`([^`]*)`/g, "$1");

  // Images ![alt](url) -> alt
  s = s.replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1");
  // Links [text](url) -> text
  s = s.replace(/\[([^\]]+)\]\([^)]*\)/g, "$1");

  // Headings, blockquotes, list bullets
  s = s.replace(/^[ \t]{0,3}#{1,6}[ \t]+/gm, "");
  s = s.replace(/^[ \t]{0,3}>[ \t]?/gm, "");
  s = s.replace(/^[ \t]*[-*+•·][ \t]+/gm, "");
  s = s.replace(/^[ \t]*\d+\.[ \t]+/gm, "");

  // Bold / italic markers
  s = s.replace(/\*{3,}/g, " ");
  s = s.replace(/\*\*([\s\S]+?)\*\*/g, "$1");
  s = s.replace(/__([\s\S]+?)__/g, "$1");
  s = s.replace(/~~([\s\S]+?)~~/g, "$1");
  s = s.replace(/(^|\s)\*+(\s|$)/g, "$1$2");
  s = s.replace(/\*+/g, "");
  s = s.replace(/_{2,}/g, " ");

  // Horizontal rules / pipe tables
  s = s.replace(/^[ \t]*([-=*_])\1{2,}[ \t]*$/gm, "");
  s = s.replace(/\|/g, " ");

  // URLs read by TTS sound terrible
  s = s.replace(/https?:\/\/\S+/gi, "");

  // Stray slashes / backslashes / pipes between words ("and/or" -> "and or")
  s = s.replace(/([A-Za-z])\s*[\/\\]\s*([A-Za-z])/g, "$1 or $2");
  s = s.replace(/[\/\\]+/g, " ");

  // Non-printable / replacement chars
  s = s.replace(/[\u0000-\u0008\u000B-\u001F\u007F]/g, " ");
  s = s.replace(/\uFFFD/g, "");

  // Bullet glyphs students complained about
  s = s.replace(/[■□●○◆◇►▪▫]/g, " ");

  // Collapse whitespace, preserve paragraph breaks
  s = s.replace(/[ \t]+/g, " ");
  s = s.replace(/ ?\n ?/g, "\n");
  s = s.replace(/\n{3,}/g, "\n\n");

  return s.trim();
}