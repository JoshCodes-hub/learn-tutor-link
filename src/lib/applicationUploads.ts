import { supabase } from "@/integrations/supabase/client";

const BUCKET = "application-documents";

/**
 * Upload a file to the user's application-documents folder.
 * Bucket is PRIVATE — returns the storage path (not a public URL).
 * Use getSignedApplicationUrl(path) to render the file when needed.
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
  // Store the storage path; signed URLs are generated on demand.
  return path;
}

/** Generate a short-lived signed URL for a stored application document. */
export async function getSignedApplicationUrl(
  pathOrUrl: string,
  expiresInSeconds = 60 * 10
): Promise<string | null> {
  if (!pathOrUrl) return null;
  // Back-compat: if a legacy public URL was stored, extract the path part.
  let path = pathOrUrl;
  const marker = "/application-documents/";
  const idx = pathOrUrl.indexOf(marker);
  if (idx !== -1) path = pathOrUrl.substring(idx + marker.length);

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, expiresInSeconds);
  if (error) {
    console.error("createSignedUrl failed", error);
    return null;
  }
  return data?.signedUrl ?? null;
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
