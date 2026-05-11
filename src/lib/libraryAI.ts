import { supabase } from "@/integrations/supabase/client";
import {
  getResourceSignedUrl, saveResource, saveTextNote, type UserResource,
} from "@/lib/userResources";
import { extractTextFromFile } from "@/lib/extractText";
import { track } from "@/lib/analytics";

export type LibraryAIAction = "flashcards" | "summary" | "quiz";

export interface LibraryAIResult {
  action: LibraryAIAction;
  /** For flashcards — the parsed cards so the caller can open the study dialog. */
  cards?: { front: string; back: string; hint?: string }[];
  /** Library row that was created to store the AI output. */
  saved?: UserResource;
}

/** Map an upload's `material_type` to the most useful AI action. */
export function suggestedActionForMaterial(materialType?: string | null): LibraryAIAction | null {
  switch (materialType) {
    case "outline": return "flashcards";
    case "notes":   return "summary";
    case "past_q":  return "quiz";
    case "slides":  return "flashcards";
    default:        return null;
  }
}

/** Fetch the resource's bytes via signed URL and run client-side extraction. */
async function getTextForResource(r: UserResource): Promise<string> {
  const url = await getResourceSignedUrl(r.storage_path, 600);
  if (!url) throw new Error("Could not open file");
  const blob = await (await fetch(url)).blob();
  const file = new File([blob], r.title || "material", { type: r.mime || blob.type });
  if (file.type.startsWith("text/") || /\.(txt|md)$/i.test(r.title)) return await file.text();
  const text = await extractTextFromFile(file);
  if (!text || text.length < 50) {
    throw new Error("Couldn't extract enough text from this file. Image-only PDFs aren't supported yet.");
  }
  return text;
}

/**
 * Run a library-ai action against a saved resource, persist the output back
 * to the user's library, and emit analytics. Throws on failure.
 */
export async function runLibraryAI(
  resource: UserResource,
  action: LibraryAIAction,
  userId: string,
): Promise<LibraryAIResult> {
  const startedAt = Date.now();
  void track("library_ai_started", { action, resource_id: resource.id });

  const text = await getTextForResource(resource);
  const { data, error } = await supabase.functions.invoke("library-ai", {
    body: {
      action,
      text,
      title: resource.title,
      count: action === "flashcards" ? 15 : action === "quiz" ? 10 : undefined,
      difficulty: "medium",
    },
  });
  if (error) throw new Error(error.message);
  if ((data as any)?.error) throw new Error((data as any).error);
  const result = (data as any)?.result;

  let saved: UserResource | undefined;
  let cards: LibraryAIResult["cards"];

  if (action === "flashcards") {
    const list = (result?.cards || []).filter((c: any) => c?.front && c?.back);
    if (!list.length) throw new Error("No flashcards generated");
    saved = await saveResource({
      userId,
      kind: "flashcard",
      title: `Flashcards — ${resource.title}`,
      folder: resource.folder,
      blob: new Blob([JSON.stringify({ cards: list }, null, 2)], { type: "application/json" }),
      mime: "application/json",
      ext: "json",
      meta: { source_resource_id: resource.id, count: list.length },
    });
    cards = list;
  } else if (action === "summary") {
    const lines = [
      `# ${result.title || resource.title}`,
      ``,
      `## Overview`,
      result.overview || "",
      ``,
      `## Key points`,
      ...(result.key_points || []).map((k: string) => `• ${k}`),
      ``,
      `## Must know`,
      ...(result.must_know || []).map((k: string) => `★ ${k}`),
    ].join("\n");
    saved = await saveTextNote({
      userId,
      title: `Summary — ${resource.title}`,
      content: lines,
      folder: resource.folder,
      meta: { source_resource_id: resource.id, material_type: "summary" },
    });
  } else if (action === "quiz") {
    const qs = result?.questions || [];
    if (!qs.length) throw new Error("No questions generated");
    saved = await saveResource({
      userId,
      kind: "note",
      title: `Quiz — ${resource.title}`,
      folder: resource.folder,
      blob: new Blob([JSON.stringify({ questions: qs }, null, 2)], { type: "application/json" }),
      mime: "application/json",
      ext: "json",
      meta: { source_resource_id: resource.id, material_type: "quiz", count: qs.length },
    });
  }

  void track("library_ai_completed", {
    action,
    resource_id: resource.id,
    duration_ms: Date.now() - startedAt,
  });

  return { action, cards, saved };
}
