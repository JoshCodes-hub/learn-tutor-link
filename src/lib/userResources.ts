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
    .insert({
      user_id: userId,
      kind,
      title,
      folder,
      storage_path: path,
      mime: opts.mime || blob.type || null,
      size_bytes: blob.size,
      meta: meta || {},
    })
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
