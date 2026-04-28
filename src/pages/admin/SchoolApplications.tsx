import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import AppScreen from "@/components/app-shell/AppScreen";
import AppListItem from "@/components/app-shell/AppListItem";
import { Button } from "@/components/ui/button";
import { School, Check, X, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function AdminSchoolApplications() {
  const { hasRole } = useAuth();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const { data } = await supabase.from("schools").select("*").order("created_at", { ascending: false });
    setRows(data || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const act = async (id: string, status: "approved" | "rejected") => {
    const { error } = await supabase.from("schools").update({ status }).eq("id", id);
    if (error) return toast.error(error.message);
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
                    <Button size="sm" onClick={() => act(s.id, "approved")}><Check className="w-4 h-4 mr-1" />Approve</Button>
                    <Button size="sm" variant="outline" onClick={() => act(s.id, "rejected")}><X className="w-4 h-4 mr-1" />Reject</Button>
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
