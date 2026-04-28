import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import {
  Activity,
  AlertTriangle,
  Users,
  PlayCircle,
  CheckCircle2,
  RefreshCw,
  Loader2,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

interface DailyPoint {
  day: string;
  active_users: number;
  quizzes_started: number;
  quizzes_completed: number;
  errors: number;
}

interface ErrorRow {
  id: string;
  message: string;
  path: string | null;
  created_at: string;
  user_id: string | null;
  resolved: boolean;
}

const DAYS = 14;

function dayKey(d: Date) {
  return d.toISOString().slice(0, 10);
}

export const HealthDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [series, setSeries] = useState<DailyPoint[]>([]);
  const [recentErrors, setRecentErrors] = useState<ErrorRow[]>([]);
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [metricsRes, recentErrRes] = await Promise.all([
        (supabase as any).rpc("get_health_metrics", { days: DAYS }),
        supabase
          .from("client_errors")
          .select("id, message, path, created_at, user_id, resolved")
          .order("created_at", { ascending: false })
          .limit(25),
      ]);

      const rows = (metricsRes.data ?? []) as Array<{
        day: string;
        active_users: number;
        quizzes_started: number;
        quizzes_completed: number;
        errors: number;
      }>;

      setSeries(
        rows.map((r) => ({
          day: String(r.day).slice(5),
          active_users: r.active_users ?? 0,
          quizzes_started: r.quizzes_started ?? 0,
          quizzes_completed: r.quizzes_completed ?? 0,
          errors: r.errors ?? 0,
        }))
      );
      setRecentErrors(recentErrRes.data ?? []);
    } catch (err) {
      console.error("[HealthDashboard]", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const totals = useMemo(() => {
    return series.reduce(
      (acc, p) => ({
        active_users: acc.active_users + p.active_users,
        quizzes_started: acc.quizzes_started + p.quizzes_started,
        quizzes_completed: acc.quizzes_completed + p.quizzes_completed,
        errors: acc.errors + p.errors,
      }),
      { active_users: 0, quizzes_started: 0, quizzes_completed: 0, errors: 0 }
    );
  }, [series]);

  const todayActive = series[series.length - 1]?.active_users ?? 0;

  const resolveError = async (id: string) => {
    setResolvingId(id);
    try {
      await supabase.from("client_errors").update({ resolved: true }).eq("id", id);
      setRecentErrors((prev) => prev.map((e) => (e.id === id ? { ...e, resolved: true } : e)));
    } finally {
      setResolvingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold text-foreground flex items-center gap-2">
            <Activity className="w-6 h-6 text-primary" /> Platform Health
          </h2>
          <p className="text-sm text-muted-foreground">Last {DAYS} days · refreshed on load</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchAll}>
          <RefreshCw className="w-4 h-4 mr-2" /> Refresh
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Kpi icon={<Users className="w-5 h-5" />} label="Active today" value={todayActive} tone="emerald" />
        <Kpi icon={<PlayCircle className="w-5 h-5" />} label="Quizzes started" value={totals.quizzes_started} tone="gold" />
        <Kpi icon={<CheckCircle2 className="w-5 h-5" />} label="Quizzes completed" value={totals.quizzes_completed} tone="sapphire" />
        <Kpi icon={<AlertTriangle className="w-5 h-5" />} label="Errors" value={totals.errors} tone={totals.errors > 0 ? "rose" : "slate"} />
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Daily active users</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={series}>
                <defs>
                  <linearGradient id="dau" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.45} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} allowDecimals={false} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                <Area type="monotone" dataKey="active_users" stroke="hsl(var(--primary))" fill="url(#dau)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Quizzes & errors</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={series}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} allowDecimals={false} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                <Area type="monotone" dataKey="quizzes_started" stroke="#f59e0b" fill="#f59e0b22" strokeWidth={2} />
                <Area type="monotone" dataKey="quizzes_completed" stroke="#10b981" fill="#10b98122" strokeWidth={2} />
                <Area type="monotone" dataKey="errors" stroke="#ef4444" fill="#ef444422" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Recent errors */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-destructive" /> Recent client errors
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentErrors.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">No errors recorded — nice and quiet.</p>
          ) : (
            <ScrollArea className="h-80 pr-3">
              <ul className="space-y-2">
                {recentErrors.map((e) => (
                  <li key={e.id} className="border border-border rounded-lg p-3 bg-card/40">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground break-words">{e.message}</p>
                        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                          <span>{new Date(e.created_at).toLocaleString()}</span>
                          {e.path && <Badge variant="outline" className="text-[10px]">{e.path}</Badge>}
                          {e.resolved && <Badge className="text-[10px] bg-emerald-500/15 text-emerald-600 border-emerald-500/30">Resolved</Badge>}
                        </div>
                      </div>
                      {!e.resolved && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => resolveError(e.id)}
                          disabled={resolvingId === e.id}
                        >
                          {resolvingId === e.id ? <Loader2 className="w-3 h-3 animate-spin" /> : "Resolve"}
                        </Button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

const TONE: Record<string, string> = {
  gold: "from-amber-500/15 to-amber-500/0 text-amber-600 border-amber-500/30",
  emerald: "from-emerald-500/15 to-emerald-500/0 text-emerald-600 border-emerald-500/30",
  sapphire: "from-sky-500/15 to-sky-500/0 text-sky-600 border-sky-500/30",
  rose: "from-rose-500/15 to-rose-500/0 text-rose-600 border-rose-500/30",
  slate: "from-slate-500/15 to-slate-500/0 text-slate-600 border-slate-500/30",
};

const Kpi = ({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  tone: keyof typeof TONE;
}) => (
  <div className={`rounded-xl border bg-gradient-to-br p-4 ${TONE[tone]}`}>
    <div className="flex items-center justify-between">
      <span className="text-xs uppercase tracking-wide text-muted-foreground">{label}</span>
      {icon}
    </div>
    <p className="font-display text-3xl font-bold text-foreground mt-2">{value.toLocaleString()}</p>
  </div>
);

export default HealthDashboard;
