import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { ShieldAlert, GraduationCap, AlertOctagon, Calendar, RefreshCcw } from "lucide-react";

interface Kpis {
  pending_tutor_apps: number;
  low_trust_users_24h: number;
  open_moderation_reports: number;
  opportunities_expiring_7d: number;
  refunds_24h: number;
}

const tiles = [
  { key: "pending_tutor_apps", label: "Pending tutors", icon: GraduationCap, to: "/admin/tutor-applications" },
  { key: "open_moderation_reports", label: "Moderation", icon: AlertOctagon, to: "/admin/moderation" },
  { key: "opportunities_expiring_7d", label: "Opps expiring", icon: Calendar, to: "/admin/opportunities" },
  { key: "refunds_24h", label: "Refunds 24h", icon: RefreshCcw, to: "/admin/withdrawals" },
  { key: "low_trust_users_24h", label: "Low trust", icon: ShieldAlert, to: "/admin/trust" },
] as const;

export default function AdminKpiStrip() {
  const { data, isLoading } = useQuery<Kpis | null>({
    queryKey: ["admin-kpis"],
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc("get_admin_kpis");
      if (error) throw error;
      return (Array.isArray(data) ? data[0] : data) ?? null;
    },
  });

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-4">
      {tiles.map((t) => {
        const value = (data as any)?.[t.key] ?? 0;
        const Icon = t.icon;
        return (
          <Link key={t.key} to={t.to}
            className="rounded-xl border border-amber-100/70 bg-card p-3 hover:border-amber-300 transition-colors">
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-muted-foreground font-bold">
              <Icon className="h-3.5 w-3.5 text-amber-600" /> {t.label}
            </div>
            <div className="mt-1 font-display text-2xl font-bold tabular-nums">
              {isLoading ? "—" : value}
            </div>
          </Link>
        );
      })}
    </div>
  );
}