import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

/**
 * Resolves the current user's active school:
 * - If owner: their school (must be approved)
 * - Else: first school via school_members
 * Auto-redirects unapproved owners to /school/pending or /school/register.
 */
export function useCurrentSchool() {
  const { user, primaryRole } = useAuth();
  const navigate = useNavigate();
  const [school, setSchool] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      // try owner
      const { data: owned } = await supabase
        .from("schools")
        .select("*")
        .eq("owner_id", user.id)
        .maybeSingle();

      if (owned) {
        if (owned.status !== "approved" && primaryRole !== "admin") {
          navigate(owned.status === "pending" ? "/school/pending" : "/school/register", { replace: true });
          return;
        }
        setSchool(owned);
        setLoading(false);
        return;
      }

      // try membership
      const { data: mem } = await supabase
        .from("school_members")
        .select("school_id, schools(*)")
        .eq("user_id", user.id)
        .limit(1)
        .maybeSingle();

      if (mem?.schools) {
        setSchool(mem.schools);
      }
      setLoading(false);
    })();
  }, [user, primaryRole, navigate]);

  return { school, loading };
}
