import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import AppScreen from "@/components/app-shell/AppScreen";
import { Clock, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

const SchoolPending = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [school, setSchool] = useState<any>(null);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data } = await supabase.from("schools").select("*").eq("owner_id", user.id).maybeSingle();
      setSchool(data);
      if (data?.status === "approved") navigate("/school/dashboard", { replace: true });
    };
    load();
    const interval = setInterval(load, 15000);
    return () => clearInterval(interval);
  }, [user, navigate]);

  return (
    <AppScreen title="Application status">
      <div className="max-w-md mx-auto text-center py-10">
        {school?.status === "rejected" ? (
          <>
            <div className="w-20 h-20 rounded-full bg-destructive/10 mx-auto flex items-center justify-center mb-5">
              <XCircle className="w-10 h-10 text-destructive" />
            </div>
            <h2 className="font-display text-2xl font-bold mb-2">Application not approved</h2>
            <p className="text-muted-foreground mb-3">{school.rejection_reason || "Please review and re-apply."}</p>
            <Button onClick={() => navigate("/school/register")}>Re-apply</Button>
          </>
        ) : school?.status === "approved" ? (
          <>
            <CheckCircle2 className="w-16 h-16 text-primary mx-auto mb-4" />
            <p>Redirecting…</p>
          </>
        ) : (
          <>
            <div className="w-20 h-20 rounded-full bg-primary/10 mx-auto flex items-center justify-center mb-5 animate-pulse">
              <Clock className="w-10 h-10 text-primary" />
            </div>
            <h2 className="font-display text-2xl font-bold mb-2">Under review</h2>
            <p className="text-muted-foreground max-w-sm mx-auto mb-6">
              Thanks for applying{school?.name ? ` on behalf of ${school.name}` : ""}. Our team usually
              responds within 24 hours. We'll notify you the moment it's approved.
            </p>
            <Button variant="outline" onClick={() => navigate("/")}>Back home</Button>
          </>
        )}
      </div>
    </AppScreen>
  );
};

export default SchoolPending;
