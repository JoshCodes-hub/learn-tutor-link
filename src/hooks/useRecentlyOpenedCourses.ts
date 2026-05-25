import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface RecentCourse {
  course_id: string;
  opened_at: string;
  courses: { id: string; code: string; name: string; department: string | null; level: string | null } | null;
}

export function useRecentlyOpenedCourses(limit = 8) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["recent-courses", user?.id, limit],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("recently_opened_courses")
        .select("course_id, opened_at, courses(id, code, name, department, level)")
        .order("opened_at", { ascending: false })
        .limit(limit);
      return (data ?? []) as RecentCourse[];
    },
  });
}

export function useTrackCourseOpen(courseId?: string) {
  const { user } = useAuth();
  const qc = useQueryClient();
  useEffect(() => {
    if (!user || !courseId) return;
    (async () => {
      await (supabase as any)
        .from("recently_opened_courses")
        .upsert(
          { user_id: user.id, course_id: courseId, opened_at: new Date().toISOString() },
          { onConflict: "user_id,course_id" },
        );
      qc.invalidateQueries({ queryKey: ["recent-courses", user.id] });
    })();
  }, [user, courseId, qc]);
}