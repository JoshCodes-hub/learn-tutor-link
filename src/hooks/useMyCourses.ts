import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export function useMyCourses() {
  const { user } = useAuth();
  const [courseIds, setCourseIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) {
      setCourseIds([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await (supabase as any)
      .from("student_courses")
      .select("course_id")
      .eq("student_id", user.id);
    setCourseIds((data ?? []).map((r: any) => r.course_id));
    setLoading(false);
  }, [user]);

  useEffect(() => { refresh(); }, [refresh]);

  return { courseIds, loading, refresh };
}
