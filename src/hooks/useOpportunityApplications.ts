import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type AppStatus = "interested" | "applied" | "accepted" | "rejected";

export interface OpportunityApplication {
  id: string;
  opportunity_id: string;
  user_id: string;
  status: AppStatus;
  note: string | null;
  created_at: string;
  updated_at: string;
}

export function useMyOpportunityApplications() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["my-opp-apps", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await (supabase.from as any)("opportunity_applications")
        .select("*").eq("user_id", user!.id).order("updated_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as OpportunityApplication[];
    },
  });
}

export function useMyApplicationFor(opportunityId: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["my-opp-app", user?.id, opportunityId],
    enabled: !!user && !!opportunityId,
    queryFn: async () => {
      const { data, error } = await (supabase.from as any)("opportunity_applications")
        .select("*").eq("user_id", user!.id).eq("opportunity_id", opportunityId).maybeSingle();
      if (error) throw error;
      return data as OpportunityApplication | null;
    },
  });
}

export function useSetApplicationStatus() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ opportunityId, status, note }: { opportunityId: string; status: AppStatus; note?: string }) => {
      if (!user) throw new Error("Sign in required");
      const { error } = await (supabase.from as any)("opportunity_applications")
        .upsert(
          { user_id: user.id, opportunity_id: opportunityId, status, note: note ?? null },
          { onConflict: "opportunity_id,user_id" },
        );
      if (error) throw error;
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["my-opp-apps"] });
      qc.invalidateQueries({ queryKey: ["my-opp-app", user?.id, v.opportunityId] });
    },
  });
}