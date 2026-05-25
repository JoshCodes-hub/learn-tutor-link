import { supabase } from "@/integrations/supabase/client";

export const RESOURCES_BUCKET = "user-resources";

export type ResourceKind =
  | "pdf"
  | "image"
  | "note"
  | "flashcard"
  | "study_pack"
  | "audio";

export interface UserResource {
  id: string;
  user_id: string;
  kind: ResourceKind;
  title: string;
  folder: string;
  storage_path: string;
  mime: string | null;
  size_bytes: number | null;
  meta: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export const KIND_META: Record<ResourceKind, { label: string; emoji: string }> = {
  pdf:         { label: "PDFs",        emoji: "📄" },
  image:       { label: "Images",      emoji: "🖼️" },
  note:        { label: "Notes",       emoji: "📝" },
  flashcard:   { label: "Flashcards",  emoji: "🃏" },
  study_pack:  { label: "Study Packs", emoji: "📚" },
  audio:       { label: "Audio",       emoji: "🎧" },
};

const sanitize = (s: string) => s.replace(/[^\w.\-]+/g, "_").slice(0, 80) || "file";

const normalizeTitle = (s: string) =>
  s.toLowerCase().replace(/\.[a-z0-9]+$/i, "").replace(/[^a-z0-9]+/g, " ").trim();

/** SHA-256 hex digest of a Blob's bytes (browser SubtleCrypto). */
export async function sha256Blob(blob: Blob): Promise<string | null> {
  try {
    const buf = await blob.arrayBuffer();
    const hash = await crypto.subtle.digest("SHA-256", buf);
    return Array.from(new Uint8Array(hash))
      .map((b) => b.toString(16).padStart(2, "0")).join("");
  } catch {
    return null;
  }
}

/**
 * Lightweight duplicate lookup. Checks exact content hash first, then a
 * fuzzy normalized-title match. Returns the first existing resource that
 * looks like a duplicate, or null.
 */
export async function findDuplicateResource(
  userId: string,
  opts: { hash?: string | null; title?: string | null },
): Promise<UserResource | null> {
  if (opts.hash) {
    const { data } = await supabase
      .from("user_resources")
      .select("*")
      .eq("user_id", userId)
      .filter("meta->>content_hash", "eq", opts.hash)
      .limit(1);
    if (data && data.length) return data[0] as UserResource;
  }
  if (opts.title) {
    const norm = normalizeTitle(opts.title);
    if (norm.length >= 3) {
      const { data } = await supabase
        .from("user_resources")
        .select("*")
        .eq("user_id", userId)
        .filter("meta->>normalized_title", "eq", norm)
        .limit(1);
      if (data && data.length) return data[0] as UserResource;
    }
  }
  return null;
}

/** Upload a Blob/File to the user's library and create a DB row. */
export async function saveResource(opts: {
  userId: string;
  kind: ResourceKind;
  title: string;
  folder?: string;
  blob: Blob;
  mime?: string;
  ext?: string; // e.g. "mp3", "pdf"
  meta?: Record<string, unknown>;
  courseId?: string | null;
  topicId?: string | null;
}): Promise<UserResource> {
  const { userId, kind, title, blob, meta } = opts;
  const folder = opts.folder?.trim() || "General";
  const ext = (opts.ext || (opts.mime || blob.type).split("/")[1] || "bin").toLowerCase();
  const path = `${userId}/${kind}/${Date.now()}-${sanitize(title)}.${ext}`;

  const { error: upErr } = await supabase.storage
    .from(RESOURCES_BUCKET)
    .upload(path, blob, {
      contentType: opts.mime || blob.type || "application/octet-stream",
      upsert: false,
    });
  if (upErr) throw new Error(upErr.message);

  const { data, error } = await supabase
    .from("user_resources")
    .insert([{
      user_id: userId,
      kind,
      title,
      folder,
      storage_path: path,
      mime: opts.mime || blob.type || null,
      size_bytes: blob.size,
      meta: {
        ...(meta || {}),
        normalized_title: normalizeTitle(title),
        // Content hash is best-effort: callers can pre-compute and pass it
        // via meta.content_hash to avoid hashing twice.
        content_hash:
          (meta as any)?.content_hash ?? (await sha256Blob(blob)) ?? null,
      } as never,
      course_id: opts.courseId ?? null,
      topic_id: opts.topicId ?? null,
    } as never])
    .select()
    .single();
  if (error) {
    // best-effort cleanup
    await supabase.storage.from(RESOURCES_BUCKET).remove([path]);
    throw new Error(error.message);
  }
  return data as UserResource;
}

/** Save a plain text note as a .txt file in the library. */
export function saveTextNote(opts: {
  userId: string;
  title: string;
  content: string;
  folder?: string;
  kind?: ResourceKind; // defaults to "note"
  meta?: Record<string, unknown>;
  courseId?: string | null;
  topicId?: string | null;
}) {
  return saveResource({
    userId: opts.userId,
    kind: opts.kind ?? "note",
    title: opts.title,
    folder: opts.folder,
    blob: new Blob([opts.content], { type: "text/plain" }),
    mime: "text/plain",
    ext: "txt",
    meta: opts.meta,
    courseId: opts.courseId ?? null,
    topicId: opts.topicId ?? null,
  });
}

/** Short-lived signed URL for previewing a private resource. */
export async function getResourceSignedUrl(
  storagePath: string,
  expiresInSeconds = 600,
): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(RESOURCES_BUCKET)
    .createSignedUrl(storagePath, expiresInSeconds);
  if (error) {
    console.error("createSignedUrl failed", error);
    return null;
  }
  return data?.signedUrl ?? null;
}

export async function deleteResource(r: Pick<UserResource, "id" | "storage_path">) {
  await supabase.storage.from(RESOURCES_BUCKET).remove([r.storage_path]);
  const { error } = await supabase.from("user_resources").delete().eq("id", r.id);
  if (error) throw new Error(error.message);
}
