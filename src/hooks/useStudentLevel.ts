import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export const LEVEL_OPTIONS = [
  { value: "100", label: "100 Level" },
  { value: "200", label: "200 Level" },
  { value: "300", label: "300 Level" },
  { value: "400", label: "400 Level" },
  { value: "500", label: "500 Level" },
  { value: "JAMB", label: "JAMB" },
  { value: "Secondary", label: "Secondary" },
];

export function useStudentLevel() {
  const { user, profile, refreshProfile } = useAuth();
  const qc = useQueryClient();
  const level = (profile as any)?.level as string | null | undefined;

  const setLevel = useCallback(
    async (next: string) => {
      if (!user) return;
      const { error } = await supabase
        .from("profiles")
        .update({ level: next } as any)
        .eq("id", user.id);
      if (error) {
        toast({ title: "Could not switch level", description: error.message, variant: "destructive" });
        return;
      }
      await refreshProfile();
      qc.invalidateQueries();
      toast({ title: "Level updated", description: `Now showing ${next} content.` });
    },
    [user, refreshProfile, qc]
  );

  return { level: level || null, setLevel };
}
