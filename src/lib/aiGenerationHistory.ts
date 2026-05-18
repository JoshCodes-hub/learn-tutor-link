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