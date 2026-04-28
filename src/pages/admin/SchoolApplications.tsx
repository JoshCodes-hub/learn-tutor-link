import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import AppScreen from "@/components/app-shell/AppScreen";
import AppListItem from "@/components/app-shell/AppListItem";
import { Button } from "@/components/ui/button";
import { School, Check, X, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function AdminSchoolApplications() {
  const { user, hasRole } = useAuth();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const { data } = await supabase.from("schools").select("*").order("created_at", { ascending: false });
    setRows(data || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const act = async (school: any, status: "approved" | "rejected") => {
    const { error } = await supabase.from("schools").update({ status }).eq("id", school.id);
    if (error) return toast.error(error.message);

    // Audit log
    if (user) {
      await supabase.rpc("log_admin_action", {
        p_admin_id: user.id,
        p_action: status === "approved" ? "approve_school" : "reject_school",
        p_table_name: "schools",
        p_record_id: school.id,
        p_old_data: { status: school.status } as any,
        p_new_data: { status } as any,
      });
    }

    // In-app notification to the school owner
    if (school.owner_id) {
      await supabase.from("notifications").insert({
        user_id: school.owner_id,
        title: status === "approved" ? "School approved" : "School application update",
        message: status === "approved"
          ? `${school.name} has been approved. You can now access your full school management dashboard.`
          : `Your application for ${school.name} was not approved at this time. Please contact support for next steps.`,
        type: status === "approved" ? "success" : "warning",
        link: status === "approved" ? "/school/dashboard" : "/school/register",
      });
    }

    toast.success(`School ${status}`);
    load();
  };

  if (!hasRole("admin")) return <AppScreen title="Forbidden"><p>Admins only.</p></AppScreen>;

  return (
    <AppScreen title="School applications" back>
      <div className="max-w-2xl mx-auto">
        {loading ? <Loader2 className="w-5 h-5 animate-spin text-primary mx-auto" /> : (
          <div className="space-y-3">
            {rows.map((s) => (
              <div key={s.id} className="p-4 rounded-2xl border border-border bg-card">
                <AppListItem icon={School} title={s.name} subtitle={`${s.state || ""} · ${s.status}`} />
                {s.address && <p className="text-xs text-muted-foreground mt-2">{s.address}</p>}
                <div className="text-xs text-muted-foreground mt-1">
                  {s.principal_name} · {s.phone} · {s.email}
                </div>
                {s.status === "pending" && (
                  <div className="flex gap-2 mt-3">
                    <Button size="sm" onClick={() => act(s, "approved")}><Check className="w-4 h-4 mr-1" />Approve</Button>
                    <Button size="sm" variant="outline" onClick={() => act(s, "rejected")}><X className="w-4 h-4 mr-1" />Reject</Button>
                  </div>
                )}
              </div>
            ))}
            {rows.length === 0 && <p className="text-sm text-muted-foreground text-center py-10">No school applications yet.</p>}
          </div>
        )}
      </div>
    </AppScreen>
  );
}
