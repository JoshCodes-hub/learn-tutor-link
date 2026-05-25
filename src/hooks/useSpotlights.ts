import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Spotlight {
  id: string;
  user_id: string | null;
  category: "graduating" | "innovator" | "hackathon" | "scholarship" | "top_performer";
  title: string;
  summary: string | null;
  image_url: string | null;
  link_url: string | null;
  featured_until: string | null;
  created_at: string;
}

export function useSpotlights(limit = 20) {
  return useQuery({
    queryKey: ["spotlights", limit],
    queryFn: async () => {
      const today = new Date().toISOString().slice(0, 10);
      const { data, error } = await (supabase.from as any)("student_spotlights")
        .select("*")
        .or(`featured_until.is.null,featured_until.gte.${today}`)
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as Spotlight[];
    },
  });
}