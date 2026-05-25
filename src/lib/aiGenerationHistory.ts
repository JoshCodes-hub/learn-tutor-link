import { supabase } from "@/integrations/supabase/client";

export type AIGenKind = "quiz" | "flashcards" | "summary" | "audio";
export type AIGenStatus = "processing" | "completed" | "failed" | "cancelled";

export interface AIGenRow {
  id: string;
  user_id: string;
  resource_id: string | null;
  resource_label: string | null;
  kind: AIGenKind;
  status: AIGenStatus;
  output_ref: string | null;
  params: Record<string, unknown>;
  created_at: string;
}

export async function logAIGeneration(input: {
  userId: string;
  kind: AIGenKind;
  resourceId?: string | null;
  resourceLabel?: string | null;
  status?: AIGenStatus;
  outputRef?: string | null;
  params?: Record<string, unknown>;
  courseId?: string | null;
  topicId?: string | null;
}): Promise<string | null> {
  const { data, error } = await supabase
    .from("ai_generation_history")
    .insert({
      user_id: input.userId,
      kind: input.kind,
      resource_id: input.resourceId ?? null,
      resource_label: input.resourceLabel ?? null,
      status: input.status ?? "processing",
      output_ref: input.outputRef ?? null,
      params: (input.params ?? {}) as never,
      course_id: input.courseId ?? null,
      topic_id: input.topicId ?? null,
    })
    .select("id")
    .maybeSingle();
  if (error) {
    console.warn("ai history log failed", error.message);
    return null;
  }
  return data?.id ?? null;
}

export async function updateAIGeneration(id: string, patch: Partial<Pick<AIGenRow, "status" | "output_ref">>) {
  if (!id) return;
  const { error } = await supabase.from("ai_generation_history").update(patch).eq("id", id);
  if (error) console.warn("ai history update failed", error.message);
}

export async function listAIGenerationsForResource(resourceId: string): Promise<AIGenRow[]> {
  const { data, error } = await supabase
    .from("ai_generation_history")
    .select("*")
    .eq("resource_id", resourceId)
    .order("created_at", { ascending: false })
    .limit(20);
  if (error) return [];
  return (data ?? []) as unknown as AIGenRow[];
}

export interface AIGenFilter {
  userId: string;
  kind?: AIGenKind | "all";
  status?: AIGenStatus | "all";
  search?: string; // matches resource_label
  since?: string; // ISO date
  until?: string;
  limit?: number;
}

export async function listAIGenerations(f: AIGenFilter): Promise<AIGenRow[]> {
  let q = supabase
    .from("ai_generation_history")
    .select("*")
    .eq("user_id", f.userId)
    .order("created_at", { ascending: false })
    .limit(f.limit ?? 200);
  if (f.kind && f.kind !== "all") q = q.eq("kind", f.kind);
  if (f.status && f.status !== "all") q = q.eq("status", f.status);
  if (f.search?.trim()) q = q.ilike("resource_label", `%${f.search.trim()}%`);
  if (f.since) q = q.gte("created_at", f.since);
  if (f.until) q = q.lte("created_at", f.until);
  const { data, error } = await q;
  if (error) return [];
  return (data ?? []) as unknown as AIGenRow[];
}

export function exportAIGenerationsToCsv(rows: AIGenRow[]): string {
  const head = ["created_at", "kind", "status", "resource_label", "resource_id", "output_ref"];
  const esc = (v: unknown) => {
    const s = v == null ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [head.join(",")];
  for (const r of rows) {
    lines.push([r.created_at, r.kind, r.status, r.resource_label ?? "", r.resource_id ?? "", r.output_ref ?? ""].map(esc).join(","));
  }
  return lines.join("\n");
}

export async function deleteAIGeneration(id: string): Promise<void> {
  const { error } = await supabase.from("ai_generation_history").delete().eq("id", id);
  if (error) throw error;
}

export async function clearAllAIGenerations(userId: string): Promise<void> {
  const { error } = await supabase.from("ai_generation_history").delete().eq("user_id", userId);
  if (error) throw error;
}

/** List the current user's AI generation history scoped to a course. */
export async function listCourseAIGenerations(courseId: string): Promise<AIGenRow[]> {
  const { data, error } = await supabase.rpc("list_course_ai_generations", { _course_id: courseId } as never);
  if (error) {
    // Fallback: client filter
    const { data: d2 } = await supabase
      .from("ai_generation_history")
      .select("*")
      .eq("course_id", courseId)
      .order("created_at", { ascending: false })
      .limit(200);
    return (d2 ?? []) as unknown as AIGenRow[];
  }
  return (data ?? []) as unknown as AIGenRow[];
}