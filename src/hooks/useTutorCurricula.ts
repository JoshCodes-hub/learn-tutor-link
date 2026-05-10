import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export const TUTOR_MATERIALS_BUCKET = "tutor-materials";

export type MaterialKind = "pdf" | "note" | "flashcard_set" | "link";

export interface TutorCurriculum {
  id: string;
  tutor_id: string;
  title: string;
  slug: string | null;
  description: string | null;
  cover_url: string | null;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

export interface TutorTopic {
  id: string;
  curriculum_id: string;
  title: string;
  summary: string | null;
  order_index: number;
  created_at: string;
  updated_at: string;
}

export interface TutorMaterial {
  id: string;
  topic_id: string;
  kind: MaterialKind;
  title: string;
  storage_path: string | null;
  content_text: string | null;
  external_url: string | null;
  meta: Record<string, unknown>;
  order_index: number;
  created_at: string;
  updated_at: string;
}

/* ============= Curricula ============= */

export function useMyCurricula() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["tutor-curricula", user?.id],
    enabled: !!user?.id,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tutor_curricula")
        .select("*")
        .eq("tutor_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as TutorCurriculum[];
    },
  });
}

export function useCurriculum(id: string | undefined) {
  return useQuery({
    queryKey: ["tutor-curriculum", id],
    enabled: !!id,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tutor_curricula")
        .select("*")
        .eq("id", id!)
        .maybeSingle();
      if (error) throw error;
      return data as TutorCurriculum | null;
    },
  });
}

export function useCurriculumMutations() {
  const qc = useQueryClient();
  const { user } = useAuth();

  const create = useMutation({
    mutationFn: async (input: { title: string; description?: string }) => {
      if (!user?.id) throw new Error("not authenticated");
      const { data, error } = await supabase
        .from("tutor_curricula")
        .insert([{ tutor_id: user.id, title: input.title, description: input.description || null }])
        .select()
        .single();
      if (error) throw error;
      return data as TutorCurriculum;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tutor-curricula"] }),
  });

  const update = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<TutorCurriculum> }) => {
      const { error } = await supabase.from("tutor_curricula").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["tutor-curricula"] });
      qc.invalidateQueries({ queryKey: ["tutor-curriculum", v.id] });
    },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tutor_curricula").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tutor-curricula"] }),
  });

  return { create, update, remove };
}

/* ============= Topics ============= */

export function useTopics(curriculumId: string | undefined) {
  return useQuery({
    queryKey: ["tutor-topics", curriculumId],
    enabled: !!curriculumId,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tutor_curriculum_topics")
        .select("*")
        .eq("curriculum_id", curriculumId!)
        .order("order_index", { ascending: true });
      if (error) throw error;
      return (data || []) as TutorTopic[];
    },
  });
}

export function useTopicMutations(curriculumId: string | undefined) {
  const qc = useQueryClient();
  const inv = () => qc.invalidateQueries({ queryKey: ["tutor-topics", curriculumId] });

  const create = useMutation({
    mutationFn: async (input: { title: string; summary?: string; order_index?: number }) => {
      if (!curriculumId) throw new Error("no curriculum");
      const { data, error } = await supabase
        .from("tutor_curriculum_topics")
        .insert([{ curriculum_id: curriculumId, ...input }])
        .select()
        .single();
      if (error) throw error;
      return data as TutorTopic;
    },
    onSuccess: inv,
  });

  const update = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<TutorTopic> }) => {
      const { error } = await supabase.from("tutor_curriculum_topics").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: inv,
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tutor_curriculum_topics").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: inv,
  });

  return { create, update, remove };
}

/* ============= Materials ============= */

export function useMaterials(topicIds: string[]) {
  return useQuery({
    queryKey: ["tutor-materials", topicIds.sort().join(",")],
    enabled: topicIds.length > 0,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tutor_curriculum_materials")
        .select("*")
        .in("topic_id", topicIds)
        .order("order_index", { ascending: true });
      if (error) throw error;
      return (data || []) as TutorMaterial[];
    },
  });
}

export function useMaterialMutations(topicIds: string[]) {
  const qc = useQueryClient();
  const inv = () => qc.invalidateQueries({ queryKey: ["tutor-materials"] });

  const create = useMutation({
    mutationFn: async (input: Omit<TutorMaterial, "id" | "created_at" | "updated_at">) => {
      const { data, error } = await supabase
        .from("tutor_curriculum_materials")
        .insert([input as never])
        .select()
        .single();
      if (error) throw error;
      return data as TutorMaterial;
    },
    onSuccess: inv,
  });

  const remove = useMutation({
    mutationFn: async (m: { id: string; storage_path?: string | null }) => {
      if (m.storage_path) {
        await supabase.storage.from(TUTOR_MATERIALS_BUCKET).remove([m.storage_path]);
      }
      const { error } = await supabase.from("tutor_curriculum_materials").delete().eq("id", m.id);
      if (error) throw error;
    },
    onSuccess: inv,
  });

  return { create, remove, _topicIds: topicIds };
}

/** Upload a file to the tutor's folder in tutor-materials bucket. */
export async function uploadTutorMaterialFile(opts: {
  tutorId: string; curriculumId: string; topicId: string; file: File;
}): Promise<{ path: string; mime: string; size: number }> {
  const safe = opts.file.name.replace(/[^\w.\-]+/g, "_");
  const path = `${opts.tutorId}/${opts.curriculumId}/${opts.topicId}/${Date.now()}-${safe}`;
  const { error } = await supabase.storage
    .from(TUTOR_MATERIALS_BUCKET)
    .upload(path, opts.file, { contentType: opts.file.type, upsert: false });
  if (error) throw new Error(error.message);
  return { path, mime: opts.file.type, size: opts.file.size };
}

export async function getTutorMaterialSignedUrl(path: string, seconds = 600): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(TUTOR_MATERIALS_BUCKET)
    .createSignedUrl(path, seconds);
  if (error) return null;
  return data?.signedUrl ?? null;
}
