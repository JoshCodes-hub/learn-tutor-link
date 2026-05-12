import { supabase } from "@/integrations/supabase/client";

export type ResourceType = "material" | "quiz" | "course" | "audio";

export const recordDownload = async (params: {
  userId: string;
  resourceType: Exclude<ResourceType, "course">;
  resourceId: string;
  courseId?: string | null;
  title?: string | null;
  level?: string | null;
}) => {
  await supabase.from("student_download_history").insert({
    user_id: params.userId,
    resource_type: params.resourceType,
    resource_id: params.resourceId,
    course_id: params.courseId ?? null,
    title: params.title ?? null,
    level: params.level ?? null,
  });
};

export const toggleBookmark = async (params: {
  userId: string;
  resourceType: ResourceType;
  resourceId: string;
  courseId?: string | null;
  title?: string | null;
  level?: string | null;
}): Promise<"added" | "removed"> => {
  const { data: existing } = await supabase
    .from("student_resource_bookmarks")
    .select("id")
    .eq("user_id", params.userId)
    .eq("resource_type", params.resourceType)
    .eq("resource_id", params.resourceId)
    .maybeSingle();
  if (existing?.id) {
    await supabase.from("student_resource_bookmarks").delete().eq("id", existing.id);
    return "removed";
  }
  await supabase.from("student_resource_bookmarks").insert({
    user_id: params.userId,
    resource_type: params.resourceType,
    resource_id: params.resourceId,
    course_id: params.courseId ?? null,
    title: params.title ?? null,
    level: params.level ?? null,
  });
  return "added";
};

export const fetchBookmarks = async (userId: string) => {
  const { data } = await supabase
    .from("student_resource_bookmarks")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  return data ?? [];
};

export const fetchDownloadHistory = async (userId: string, limit = 100) => {
  const { data } = await supabase
    .from("student_download_history")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return data ?? [];
};
