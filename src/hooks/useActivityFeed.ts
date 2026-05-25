import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

export interface ActivityEvent {
  id: string;
  actor_id: string | null;
  verb: string;
  object_type: string;
  object_id: string | null;
  course_id: string | null;
  university: string | null;
  meta: Record<string, any>;
  created_at: string;
}

export function useActivityFeed(limit = 50) {
  const qc = useQueryClient();
  useEffect(() => {
    const channel = supabase
      .channel("activity-events")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "activity_events" },
        () => qc.invalidateQueries({ queryKey: ["activity-feed"] }),
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [qc]);

  return useQuery({
    queryKey: ["activity-feed", limit],
    queryFn: async () => {
      const { data, error } = await (supabase.from as any)("activity_events")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as ActivityEvent[];
    },
  });
}