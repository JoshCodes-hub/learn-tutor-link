import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface SearchHit {
  kind: "course" | "topic" | "material" | "tutor";
  id: string;
  title: string;
  subtitle: string;
  course_id: string | null;
}

export function useCourseSearch(query: string) {
  const q = query.trim();
  return useQuery({
    queryKey: ["course-search", q],
    enabled: q.length >= 2,
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc("search_courses_scoped", { _q: q });
      if (error) throw error;
      return (data ?? []) as SearchHit[];
    },
    staleTime: 30_000,
  });
}