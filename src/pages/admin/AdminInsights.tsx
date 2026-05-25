import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { ArrowLeft, Activity, GraduationCap, BookOpen, Sparkles, Users, CreditCard, Loader2 } from "lucide-react";
import { LineChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { SEO } from "@/components/seo/SEO";

interface Insights {
  dau: number;
  wau: number;
  mau: number;
  top_universities: { name: string; count: number }[];
  top_courses: { id: string; code: string; title: string; attempts: number }[];
  ai_trend: { day: string; count: number }[];
  top_tutors: { id: string; name: string; uploads: number; impacted: number }[];
  subscription_growth: { week: string; count: number }[];
}

function StatCard({ icon: Icon, label, value }: { icon: any; label: string; value: number | string }) {
  return (
    <div className="rounded-2xl border border-amber-100/70 bg-card px-4 py-4">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="h-4 w-4 text-amber-700" />
        <p className="text-[11px] font-semibold uppercase tracking-wide">{label}</p>
      </div>
      <p className="mt-2 font-display text-3xl font-bold tabular-nums">{value}</p>
    </div>
  );
}

function Section({ title, icon: Icon, children }: { title: string; icon: any; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-amber-100/70 bg-card p-5">
      <div className="flex items-center gap-2 mb-3">
        <Icon className="h-4 w-4 text-amber-700" />
        <h2 className="font-display text-sm font-bold uppercase tracking-wide text-foreground/80">{title}</h2>
      </div>
      {children}
    </section>
  );
}

export default function AdminInsights() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-insights"],
    staleTime: 1000 * 60 * 5,
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as any)("get_admin_insights");
      if (error) throw error;
      return data as Insights;
    },
  });

  return (
    <>
      <SEO title="Admin Insights — OverraPrep AI" description="Platform analytics and health overview." />
      <div className="min-h-screen bg-background">
        <header className="bg-card border-b border-amber-100/70 sticky top-0 z-30">
          <div className="container mx-auto px-4 h-14 flex items-center gap-3">
            <Link to="/admin/dashboard" className="text-muted-foreground" aria-label="Back">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <h1 className="font-display text-base font-bold">Platform Insights</h1>
          </div>
        </header>

        <main className="container mx-auto px-4 py-6 max-w-5xl space-y-6">
          {isLoading ? (
            <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-amber-600" /></div>
          ) : error || !data ? (
            <p className="text-center text-sm text-destructive py-16">Couldn't load insights.</p>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-3">
                <StatCard icon={Activity} label="DAU" value={data.dau} />
                <StatCard icon={Activity} label="WAU" value={data.wau} />
                <StatCard icon={Activity} label="MAU" value={data.mau} />
              </div>

              <Section title="AI usage (last 14 days)" icon={Sparkles}>
                <div className="h-44">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data.ai_trend} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                      <XAxis dataKey="day" tickFormatter={(d) => d?.slice(5)} fontSize={10} stroke="hsl(var(--muted-foreground))" />
                      <YAxis fontSize={10} stroke="hsl(var(--muted-foreground))" />
                      <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                      <Line type="monotone" dataKey="count" stroke="hsl(40 90% 45%)" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </Section>

              <div className="grid md:grid-cols-2 gap-4">
                <Section title="Top universities" icon={GraduationCap}>
                  <ul className="space-y-2 text-sm">
                    {data.top_universities.length === 0
                      ? <li className="text-muted-foreground text-xs">No data yet.</li>
                      : data.top_universities.map((u) => (
                        <li key={u.name} className="flex justify-between"><span className="truncate">{u.name}</span><span className="font-semibold tabular-nums">{u.count}</span></li>
                      ))}
                  </ul>
                </Section>

                <Section title="Top courses (30d)" icon={BookOpen}>
                  <ul className="space-y-2 text-sm">
                    {data.top_courses.length === 0
                      ? <li className="text-muted-foreground text-xs">No data yet.</li>
                      : data.top_courses.map((c) => (
                        <li key={c.id} className="flex justify-between gap-2">
                          <span className="truncate"><span className="font-semibold">{c.code}</span> · {c.title}</span>
                          <span className="font-semibold tabular-nums shrink-0">{c.attempts}</span>
                        </li>
                      ))}
                  </ul>
                </Section>

                <Section title="Top tutors" icon={Users}>
                  <ul className="space-y-2 text-sm">
                    {data.top_tutors.length === 0
                      ? <li className="text-muted-foreground text-xs">No data yet.</li>
                      : data.top_tutors.map((t) => (
                        <li key={t.id} className="flex justify-between gap-2">
                          <Link to={`/profile/${t.id}`} className="truncate hover:text-amber-700">{t.name || "Tutor"}</Link>
                          <span className="text-xs text-muted-foreground tabular-nums shrink-0">{t.uploads} uploads · {t.impacted} students</span>
                        </li>
                      ))}
                  </ul>
                </Section>

                <Section title="Subscription growth (8w)" icon={CreditCard}>
                  <div className="h-40">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={data.subscription_growth} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                        <XAxis dataKey="week" tickFormatter={(d) => d?.slice(5)} fontSize={10} stroke="hsl(var(--muted-foreground))" />
                        <YAxis fontSize={10} stroke="hsl(var(--muted-foreground))" />
                        <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                        <Line type="monotone" dataKey="count" stroke="hsl(40 90% 45%)" strokeWidth={2} dot={{ r: 3 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </Section>
              </div>
            </>
          )}
        </main>
      </div>
    </>
  );
}