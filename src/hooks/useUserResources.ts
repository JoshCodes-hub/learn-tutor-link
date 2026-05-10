import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { deleteResource, type UserResource } from "@/lib/userResources";

export const useUserResources = () => {
  const { user } = useAuth();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["user-resources", user?.id],
    enabled: !!user?.id,
    staleTime: 60_000,
    queryFn: async (): Promise<UserResource[]> => {
      const { data, error } = await supabase
        .from("user_resources")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as UserResource[];
    },
  });

  const remove = useMutation({
    mutationFn: async (r: UserResource) => {
      await deleteResource(r);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["user-resources", user?.id] }),
  });

  return { ...query, remove };
};
