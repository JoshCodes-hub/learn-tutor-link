import { supabase } from "@/integrations/supabase/client";
import {
  getResourceSignedUrl, saveResource, saveTextNote, type UserResource,
} from "@/lib/userResources";
import { extractTextFromFile } from "@/lib/extractText";
import { track } from "@/lib/analytics";
import { logAIGeneration, updateAIGeneration } from "@/lib/aiGenerationHistory";

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
async function getTextForResource(r: UserResource, signal?: AbortSignal): Promise<string> {
  const url = await getResourceSignedUrl(r.storage_path, 600);
  if (!url) throw new Error("Could not open file");
  const blob = await (await fetch(url, { signal })).blob();
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
  opts: { signal?: AbortSignal; courseId?: string | null; topicId?: string | null } = {},
): Promise<LibraryAIResult> {
  const startedAt = Date.now();
  void track("library_ai_started", { action, resource_id: resource.id });
  const historyId = await logAIGeneration({
    userId,
    kind: action,
    resourceId: resource.id,
    resourceLabel: resource.title,
    status: "processing",
    courseId: opts.courseId ?? null,
    topicId: opts.topicId ?? null,
  });

  try {
    if (opts.signal?.aborted) throw new DOMException("Cancelled", "AbortError");
    const text = await getTextForResource(resource, opts.signal);
    if (opts.signal?.aborted) throw new DOMException("Cancelled", "AbortError");
    const { data, error } = await supabase.functions.invoke("library-ai", {
      body: {
        action,
        text,
        title: resource.title,
        count: action === "flashcards" ? 15 : action === "quiz" ? 10 : undefined,
        difficulty: "medium",
      },
    });
    if (opts.signal?.aborted) throw new DOMException("Cancelled", "AbortError");
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
      meta: { source_resource_id: resource.id, count: list.length, course_id: opts.courseId ?? null, topic_id: opts.topicId ?? null },
    });
    cards = list;
  } else if (action === "summary") {
    const parts: string[] = [
      `# ${result.title || resource.title}`,
      ``,
      `## Overview`,
      result.overview || "",
    ];
    if (Array.isArray(result.sections) && result.sections.length) {
      for (const sec of result.sections) {
        parts.push("", `## ${sec.heading}`);
        for (const b of sec.bullets || []) parts.push(`- ${b}`);
      }
    }
    if (Array.isArray(result.key_points) && result.key_points.length) {
      parts.push("", "## Key points");
      for (const k of result.key_points) parts.push(`- ${k}`);
    }
    if (Array.isArray(result.formulas_or_definitions) && result.formulas_or_definitions.length) {
      parts.push("", "## Formulas & definitions");
      for (const k of result.formulas_or_definitions) parts.push(`- ${k}`);
    }
    if (Array.isArray(result.must_know) && result.must_know.length) {
      parts.push("", "## Must know");
      for (const k of result.must_know) parts.push(`- ${k}`);
    }
    if (Array.isArray(result.exam_tips) && result.exam_tips.length) {
      parts.push("", "## Exam tips");
      for (const k of result.exam_tips) parts.push(`- ${k}`);
    }
    const lines = parts.join("\n");
    saved = await saveTextNote({
      userId,
      title: `Summary — ${resource.title}`,
      content: lines,
      folder: resource.folder,
      meta: { source_resource_id: resource.id, material_type: "summary", course_id: opts.courseId ?? null, topic_id: opts.topicId ?? null },
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
      meta: { source_resource_id: resource.id, material_type: "quiz", count: qs.length, course_id: opts.courseId ?? null, topic_id: opts.topicId ?? null },
    });
  }

    void track("library_ai_completed", {
      action,
      resource_id: resource.id,
      duration_ms: Date.now() - startedAt,
    });
    if (historyId) {
      void updateAIGeneration(historyId, { status: "completed", output_ref: saved?.id ?? null });
    }
    return { action, cards, saved };
  } catch (err) {
    const cancelled = (err as any)?.name === "AbortError";
    if (historyId) {
      void updateAIGeneration(historyId, { status: cancelled ? "cancelled" : "failed" });
    }
    throw err;
  }
}
