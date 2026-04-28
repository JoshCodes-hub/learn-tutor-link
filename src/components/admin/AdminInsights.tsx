import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Loader2, GraduationCap, CheckCircle2, XCircle, Clock, FileWarning, Coins, BookOpen, ArrowUpRight, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";

interface FunnelStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  approvalRate: number;
  rejectionRate: number;
  avgReviewHours: number | null;
  last7days: number;
}

interface ModerationStats {
  pendingReports: number;
  unapprovedQuestions: number;
  pendingSchools: number;
  totalQuestions: number;
}

interface CourseRevenue {
  course_id: string;
  code: string;
  name: string;
  attempts: number;
  tokens: number;
}

const fmt = (n: number) => n.toLocaleString();

export function AdminInsights() {
  const [loading, setLoading] = useState(true);
  const [funnel, setFunnel] = useState<FunnelStats | null>(null);
  const [moderation, setModeration] = useState<ModerationStats | null>(null);
  const [revenue, setRevenue] = useState<CourseRevenue[]>([]);
  const [totalRevenue, setTotalRevenue] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const since7 = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

        const [appsRes, reportsRes, qApprovedRes, qTotalRes, schoolsPendingRes, premiumQuizzesRes, coursesRes] =
          await Promise.all([
            supabase.from("tutor_applications").select("status, created_at, reviewed_at"),
            supabase.from("question_reports").select("id", { count: "exact", head: true }).eq("status", "pending"),
            supabase.from("questions").select("id", { count: "exact", head: true }).eq("is_approved", false),
            supabase.from("questions").select("id", { count: "exact", head: true }),
            supabase.from("schools").select("id", { count: "exact", head: true }).eq("status", "pending"),
            supabase.from("quizzes").select("id, token_cost, course_id").eq("is_premium", true),
            supabase.from("courses").select("id, code, name"),
          ]);

        // ---- Funnel ----
        const apps = appsRes.data ?? [];
        const total = apps.length;
        const pending = apps.filter((a: any) => a.status === "pending").length;
        const approved = apps.filter((a: any) => a.status === "approved").length;
        const rejected = apps.filter((a: any) => a.status === "rejected").length;
        const decided = approved + rejected;
        const approvalRate = decided > 0 ? Math.round((approved / decided) * 100) : 0;
        const rejectionRate = decided > 0 ? 100 - approvalRate : 0;
        const last7days = apps.filter((a: any) => a.created_at >= since7).length;
        const reviewed = apps.filter((a: any) => a.reviewed_at && a.created_at);
        const avgReviewHours = reviewed.length
          ? Math.round(
              (reviewed.reduce((sum: number, a: any) => sum + (new Date(a.reviewed_at).getTime() - new Date(a.created_at).getTime()), 0) /
                reviewed.length) /
                (1000 * 60 * 60),
            )
          : null;

        // ---- Moderation ----
        const moderationStats: ModerationStats = {
          pendingReports: reportsRes.count ?? 0,
          unapprovedQuestions: qApprovedRes.count ?? 0,
          pendingSchools: schoolsPendingRes.count ?? 0,
          totalQuestions: qTotalRes.count ?? 0,
        };

        // ---- Revenue by course ----
        const premiumQuizzes = premiumQuizzesRes.data ?? [];
        const courses = coursesRes.data ?? [];
        const courseMap = new Map(courses.map((c: any) => [c.id, c]));
        const byCourse: Record<string, CourseRevenue> = {};
        let runningRevenue = 0;

        for (const quiz of premiumQuizzes) {
          const { count } = await supabase
            .from("quiz_attempts")
            .select("id", { count: "exact", head: true })
            .eq("quiz_id", quiz.id);
          const tokens = (count ?? 0) * (quiz.token_cost ?? 0);
          runningRevenue += tokens;
          if (!quiz.course_id) continue;
          const c = courseMap.get(quiz.course_id) as any;
          if (!c) continue;
          if (!byCourse[quiz.course_id]) {
            byCourse[quiz.course_id] = { course_id: quiz.course_id, code: c.code, name: c.name, attempts: 0, tokens: 0 };
          }
          byCourse[quiz.course_id].attempts += count ?? 0;
          byCourse[quiz.course_id].tokens += tokens;
        }

        const revArr = Object.values(byCourse).sort((a, b) => b.tokens - a.tokens).slice(0, 8);

        if (cancelled) return;
        setFunnel({ total, pending, approved, rejected, approvalRate, rejectionRate, avgReviewHours, last7days });
        setModeration(moderationStats);
        setRevenue(revArr);
        setTotalRevenue(runningRevenue);
      } catch (e) {
        console.error("AdminInsights error:", e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!funnel || !moderation) {
    return <p className="text-muted-foreground">Failed to load insights.</p>;
  }

  const maxRevenue = revenue[0]?.tokens || 1;
  const queueTotal = moderation.pendingReports + moderation.unapprovedQuestions + moderation.pendingSchools;

  return (
    <div className="space-y-8">
      {/* Tutor Application Funnel */}
      <Card className="glass-card">
        <CardHeader>
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <CardTitle className="font-display flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-primary" /> Tutor Application Funnel
              </CardTitle>
              <CardDescription>End-to-end view of the review pipeline</CardDescription>
            </div>
            <Badge variant="outline" className="text-xs">
              <TrendingUp className="w-3 h-3 mr-1" /> {funnel.last7days} new in last 7 days
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <FunnelStat label="Total received" value={funnel.total} icon={GraduationCap} tone="default" />
            <FunnelStat label="Pending" value={funnel.pending} icon={Clock} tone="amber" />
            <FunnelStat label="Approved" value={funnel.approved} icon={CheckCircle2} tone="emerald" />
            <FunnelStat label="Rejected" value={funnel.rejected} icon={XCircle} tone="rose" />
          </div>

          <div className="space-y-3">
            <FunnelBar label="Approval rate" pct={funnel.approvalRate} tone="emerald" />
            <FunnelBar label="Rejection rate" pct={funnel.rejectionRate} tone="rose" />
          </div>

          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm pt-2 border-t border-border/40">
            <div className="text-muted-foreground">
              Avg. time to review:{" "}
              <span className="font-semibold text-foreground">
                {funnel.avgReviewHours != null ? `${funnel.avgReviewHours}h` : "—"}
              </span>
            </div>
            <div className="text-muted-foreground">
              Decisions made: <span className="font-semibold text-foreground">{funnel.approved + funnel.rejected}</span>
            </div>
            <Button asChild variant="ghost" size="sm" className="ml-auto">
              <Link to="/admin/tutor-applications">
                Open queue <ArrowUpRight className="w-3.5 h-3.5 ml-1" />
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Content Moderation Queue */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="font-display flex items-center gap-2">
            <FileWarning className="w-5 h-5 text-primary" /> Content Moderation Queue
          </CardTitle>
          <CardDescription>
            {queueTotal === 0
              ? "Everything is clear — no items need review."
              : `${queueTotal} item${queueTotal === 1 ? "" : "s"} need attention.`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <QueueCard
              label="Question reports"
              count={moderation.pendingReports}
              hint="Reported by students"
              tone="rose"
            />
            <QueueCard
              label="Unapproved questions"
              count={moderation.unapprovedQuestions}
              hint={`of ${fmt(moderation.totalQuestions)} total`}
              tone="amber"
            />
            <QueueCard
              label="Pending schools"
              count={moderation.pendingSchools}
              hint="Awaiting verification"
              tone="sapphire"
            />
          </div>
        </CardContent>
      </Card>

      {/* Revenue by Course */}
      <Card className="glass-card">
        <CardHeader>
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <CardTitle className="font-display flex items-center gap-2">
                <Coins className="w-5 h-5 text-primary" /> Revenue by Course
              </CardTitle>
              <CardDescription>Tokens spent on premium quizzes, ranked</CardDescription>
            </div>
            <div className="text-right">
              <div className="text-xs text-muted-foreground">Total tokens collected</div>
              <div className="font-display text-2xl font-bold text-primary">{fmt(totalRevenue)}</div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {revenue.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground text-sm">
              <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-50" />
              No premium-course revenue yet. (Free Access Mode is active.)
            </div>
          ) : (
            <div className="space-y-3">
              {revenue.map((r, i) => {
                const widthPct = (r.tokens / maxRevenue) * 100;
                return (
                  <div key={r.course_id} className="rounded-lg border border-border/50 bg-muted/20 p-3">
                    <div className="flex items-center justify-between gap-3 mb-1.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-xs font-mono text-muted-foreground w-6">#{i + 1}</span>
                        <div className="min-w-0">
                          <div className="font-semibold text-sm truncate">{r.code}</div>
                          <div className="text-xs text-muted-foreground truncate">{r.name}</div>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="font-semibold text-sm text-primary">{fmt(r.tokens)} tokens</div>
                        <div className="text-[10px] text-muted-foreground">{fmt(r.attempts)} attempts</div>
                      </div>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-primary/60 to-primary rounded-full transition-all duration-700"
                        style={{ width: `${widthPct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function FunnelStat({
  label, value, icon: Icon, tone,
}: { label: string; value: number; icon: typeof GraduationCap; tone: "default" | "amber" | "emerald" | "rose" }) {
  const toneCls = {
    default: "text-foreground bg-muted/30 border-border",
    amber: "text-amber-700 dark:text-amber-300 bg-amber-500/10 border-amber-500/20",
    emerald: "text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 border-emerald-500/20",
    rose: "text-rose-700 dark:text-rose-300 bg-rose-500/10 border-rose-500/20",
  }[tone];
  return (
    <div className={`rounded-lg border p-3 ${toneCls}`}>
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-semibold mb-1">
        <Icon className="w-3 h-3" /> {label}
      </div>
      <div className="font-display text-2xl font-bold">{fmt(value)}</div>
    </div>
  );
}

function FunnelBar({ label, pct, tone }: { label: string; pct: number; tone: "emerald" | "rose" }) {
  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-semibold">{pct}%</span>
      </div>
      <Progress
        value={pct}
        className={`h-2 ${tone === "emerald" ? "[&>div]:bg-emerald-500" : "[&>div]:bg-rose-500"}`}
      />
    </div>
  );
}

function QueueCard({
  label, count, hint, tone,
}: { label: string; count: number; hint: string; tone: "rose" | "amber" | "sapphire" }) {
  const toneCls = {
    rose: "border-rose-500/30 bg-rose-500/5",
    amber: "border-amber-500/30 bg-amber-500/5",
    sapphire: "border-sky-500/30 bg-sky-500/5",
  }[tone];
  return (
    <div className={`rounded-lg border p-4 ${toneCls}`}>
      <div className="text-xs uppercase tracking-wider font-semibold text-muted-foreground mb-1">{label}</div>
      <div className="font-display text-3xl font-bold text-foreground">{fmt(count)}</div>
      <div className="text-xs text-muted-foreground mt-1">{hint}</div>
    </div>
  );
}
