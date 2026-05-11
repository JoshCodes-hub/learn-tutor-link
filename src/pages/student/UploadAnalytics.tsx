import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { format, subDays, startOfDay } from "date-fns";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from "recharts";
import { ArrowLeft, MousePointerClick, FolderOpen, CheckCircle2, XCircle, Sparkles, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import DashboardNav from "@/components/layout/DashboardNav";
import { DashboardBreadcrumb } from "@/components/layout/DashboardBreadcrumb";
import { SEO } from "@/components/seo/SEO";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type Row = {
  event_name: string;
  created_at: string;
  properties: Record<string, unknown> | null;
};

const EVENT_NAMES = [
  "upload_cta_clicked",
  "upload_dialog_opened",
  "upload_completed",
  "upload_failed",
] as const;

const RANGES = [
  { label: "7d", days: 7 },
  { label: "14d", days: 14 },
  { label: "30d", days: 30 },
] as const;

const TEMPLATE_LABEL: Record<string, string> = {
  outline: "📑 Course Outline",
  notes: "📝 Lecture Notes",
  past_questions: "🧠 Past Questions",
  slides: "🎞 Slides",
  textbook: "📚 Textbook",
  other: "📦 Other",
};

const StatCard = ({
  icon: Icon, label, value, hint, color,
}: { icon: any; label: string; value: number | string; hint?: string; color: string }) => (
  <Card className="p-4">
    <div className="flex items-start gap-3">
      <div className={`h-9 w-9 shrink-0 rounded-lg grid place-items-center ${color}`}>
        <Icon className="w-4.5 h-4.5 text-white" />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</p>
        <p className="font-display text-2xl font-bold leading-tight mt-0.5">{value}</p>
        {hint && <p className="text-[11px] text-muted-foreground mt-0.5">{hint}</p>}
      </div>
    </div>
  </Card>
);

const UploadAnalytics = () => {
  const { user, primaryRole } = useAuth();
  const navRole = (primaryRole === "admin" || primaryRole === "tutor" ? primaryRole : "student") as
    "admin" | "tutor" | "student";
  const [rangeIdx, setRangeIdx] = useState(1);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [loading, setLoading] = useState(true);

  const days = RANGES[rangeIdx].days;

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    setLoading(true);
    const since = subDays(new Date(), days - 1).toISOString();
    supabase
      .from("analytics_events")
      .select("event_name, created_at, properties")
      .eq("user_id", user.id)
      .in("event_name", EVENT_NAMES as unknown as string[])
      .gte("created_at", since)
      .order("created_at", { ascending: true })
      .limit(1000)
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) console.warn("analytics fetch failed", error);
        setRows((data as Row[]) || []);
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [user?.id, days]);

  const totals = useMemo(() => {
    const t = { cta: 0, opened: 0, completed: 0, failed: 0 };
    (rows || []).forEach((r) => {
      if (r.event_name === "upload_cta_clicked") t.cta++;
      else if (r.event_name === "upload_dialog_opened") t.opened++;
      else if (r.event_name === "upload_completed") t.completed++;
      else if (r.event_name === "upload_failed") t.failed++;
    });
    return t;
  }, [rows]);

  const completionRate = totals.opened > 0
    ? Math.round((totals.completed / totals.opened) * 100)
    : 0;
  const successRate = (totals.completed + totals.failed) > 0
    ? Math.round((totals.completed / (totals.completed + totals.failed)) * 100)
    : 0;

  // Daily series
  const series = useMemo(() => {
    const buckets = new Map<string, { day: string; cta: number; opened: number; completed: number; failed: number }>();
    for (let i = days - 1; i >= 0; i--) {
      const d = format(subDays(new Date(), i), "MMM d");
      buckets.set(d, { day: d, cta: 0, opened: 0, completed: 0, failed: 0 });
    }
    (rows || []).forEach((r) => {
      const d = format(startOfDay(new Date(r.created_at)), "MMM d");
      const b = buckets.get(d);
      if (!b) return;
      if (r.event_name === "upload_cta_clicked") b.cta++;
      else if (r.event_name === "upload_dialog_opened") b.opened++;
      else if (r.event_name === "upload_completed") b.completed++;
      else if (r.event_name === "upload_failed") b.failed++;
    });
    return Array.from(buckets.values());
  }, [rows, days]);

  // Template breakdown (from upload_completed)
  const templates = useMemo(() => {
    const counts: Record<string, number> = {};
    (rows || [])
      .filter((r) => r.event_name === "upload_completed")
      .forEach((r) => {
        const t = (r.properties?.material_type as string) || "other";
        counts[t] = (counts[t] || 0) + 1;
      });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [rows]);

  const ctaSurfaces = useMemo(() => {
    const counts: Record<string, number> = {};
    (rows || [])
      .filter((r) => r.event_name === "upload_cta_clicked")
      .forEach((r) => {
        const s = (r.properties?.surface as string) || "unknown";
        counts[s] = (counts[s] || 0) + 1;
      });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [rows]);

  const maxTpl = templates[0]?.[1] || 1;
  const maxSurface = ctaSurfaces[0]?.[1] || 1;

  return (
    <>
      <SEO title="Upload Analytics" description="Your personal upload activity breakdown." url="https://overraprep.com/library/analytics" />
      <div className="min-h-screen bg-background pb-24">
        <DashboardNav role={navRole} />
        <DashboardBreadcrumb role={navRole} />

        <main className="container mx-auto px-4 py-6 max-w-5xl">
          <div className="flex items-center justify-between mb-5 gap-3">
            <div className="min-w-0">
              <Button asChild variant="ghost" size="sm" className="-ml-2 mb-1 h-7 px-2 text-xs">
                <Link to="/library"><ArrowLeft className="w-3.5 h-3.5 mr-1" /> Library</Link>
              </Button>
              <h1 className="font-display text-2xl font-bold leading-tight">Upload Analytics</h1>
              <p className="text-sm text-muted-foreground mt-0.5">Your personal usage breakdown over the last {days} days.</p>
            </div>
            <div className="flex items-center gap-1 rounded-full border border-border p-1 bg-background shrink-0">
              {RANGES.map((r, i) => (
                <button
                  key={r.label}
                  onClick={() => setRangeIdx(i)}
                  className={`text-xs font-semibold px-2.5 h-7 rounded-full transition-colors ${
                    i === rangeIdx ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                  }`}
                >{r.label}</button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="grid place-items-center py-16 text-muted-foreground">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : (
            <>
              {/* Stat cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                <StatCard icon={MousePointerClick} label="CTA taps" value={totals.cta}
                          color="bg-gradient-to-br from-amber-400 to-amber-600" />
                <StatCard icon={FolderOpen} label="Dialog opens" value={totals.opened}
                          color="bg-gradient-to-br from-sky-400 to-sky-600" />
                <StatCard icon={CheckCircle2} label="Completed" value={totals.completed}
                          hint={`${completionRate}% of opens`}
                          color="bg-gradient-to-br from-emerald-400 to-emerald-600" />
                <StatCard icon={XCircle} label="Failed" value={totals.failed}
                          hint={totals.completed + totals.failed > 0 ? `${successRate}% success` : undefined}
                          color="bg-gradient-to-br from-rose-400 to-rose-600" />
              </div>

              {/* Time series */}
              <Card className="p-4 mb-6">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-display font-bold">Activity over time</h2>
                  <span className="text-[11px] text-muted-foreground">events / day</span>
                </div>
                <div className="w-full h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={series} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                      <defs>
                        <linearGradient id="gCta" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="hsl(38 92% 55%)" stopOpacity={0.5} />
                          <stop offset="100%" stopColor="hsl(38 92% 55%)" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="gOpen" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="hsl(200 90% 55%)" stopOpacity={0.5} />
                          <stop offset="100%" stopColor="hsl(200 90% 55%)" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="gDone" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="hsl(150 65% 45%)" stopOpacity={0.5} />
                          <stop offset="100%" stopColor="hsl(150 65% 45%)" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                      <XAxis dataKey="day" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" width={28} />
                      <Tooltip
                        contentStyle={{
                          background: "hsl(var(--background))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: 8,
                          fontSize: 12,
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Area type="monotone" dataKey="cta" name="CTA taps" stroke="hsl(38 92% 55%)" fill="url(#gCta)" />
                      <Area type="monotone" dataKey="opened" name="Opens" stroke="hsl(200 90% 55%)" fill="url(#gOpen)" />
                      <Area type="monotone" dataKey="completed" name="Completed" stroke="hsl(150 65% 45%)" fill="url(#gDone)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              {/* Two-column lists */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="p-4">
                  <h2 className="font-display font-bold mb-3 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-500" /> Template usage
                  </h2>
                  {templates.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No uploads yet in this range.</p>
                  ) : (
                    <ul className="space-y-2.5">
                      {templates.map(([key, count]) => (
                        <li key={key}>
                          <div className="flex items-center justify-between text-sm mb-1">
                            <span className="font-medium truncate">{TEMPLATE_LABEL[key] || key}</span>
                            <span className="text-muted-foreground tabular-nums">{count}</span>
                          </div>
                          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-amber-400 to-amber-600 rounded-full"
                              style={{ width: `${(count / maxTpl) * 100}%` }}
                            />
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </Card>

                <Card className="p-4">
                  <h2 className="font-display font-bold mb-3 flex items-center gap-1.5">
                    <MousePointerClick className="w-4 h-4 text-sky-500" /> CTA tap source
                  </h2>
                  {ctaSurfaces.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No CTA taps in this range.</p>
                  ) : (
                    <ul className="space-y-2.5">
                      {ctaSurfaces.map(([key, count]) => (
                        <li key={key}>
                          <div className="flex items-center justify-between text-sm mb-1">
                            <span className="font-medium capitalize truncate">{key.split("_").join(" ")}</span>
                            <span className="text-muted-foreground tabular-nums">{count}</span>
                          </div>
                          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-sky-400 to-sky-600 rounded-full"
                              style={{ width: `${(count / maxSurface) * 100}%` }}
                            />
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </Card>
              </div>
            </>
          )}
        </main>
      </div>
    </>
  );
};

export default UploadAnalytics;