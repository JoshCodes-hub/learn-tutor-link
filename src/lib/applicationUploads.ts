import { supabase } from "@/integrations/supabase/client";

const BUCKET = "application-documents";

/**
 * Upload a file to the user's application-documents folder.
 * Returns the public URL or null on failure.
 */
export async function uploadApplicationFile(
  userId: string,
  file: File,
  kind: string
): Promise<string | null> {
  if (!file) return null;
  const ext = file.name.split(".").pop() || "bin";
  const path = `${userId}/${kind}-${Date.now()}.${ext}`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
  });
  if (error) {
    console.error(`upload ${kind} failed`, error);
    return null;
  }
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

export const MAX_DOC_BYTES = 10 * 1024 * 1024; // 10 MB
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB

export function validateFile(
  file: File,
  opts: { maxBytes?: number; accept?: "image" | "doc" } = {}
): string | null {
  const maxBytes = opts.maxBytes ?? MAX_DOC_BYTES;
  if (file.size > maxBytes) {
    return `File too large. Max ${(maxBytes / (1024 * 1024)).toFixed(0)} MB.`;
  }
  if (opts.accept === "image" && !file.type.startsWith("image/")) {
    return "Please select an image file (JPG/PNG).";
  }
  if (
    opts.accept === "doc" &&
    !/(image\/|application\/pdf)/.test(file.type)
  ) {
    return "Please upload a PDF or image.";
  }
  return null;
}
