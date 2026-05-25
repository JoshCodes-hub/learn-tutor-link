import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface CourseSnapshot {
  id: string;
  code: string;
  name: string;
  department: string | null;
  level: string | null;
  unread_updates: number;
  last_opened_at: string | null;
}

/** One round-trip snapshot of every course the student is enrolled in. */
export function useCourseSnapshots() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["course-snapshots", user?.id],
    enabled: !!user,
    staleTime: 60_000,
    queryFn: async (): Promise<CourseSnapshot[]> => {
      const { data, error } = await (supabase as any).rpc("get_course_snapshots", {
        _user_id: user!.id,
      });
      if (error) throw error;
      return (data ?? []) as CourseSnapshot[];
    },
  });
}