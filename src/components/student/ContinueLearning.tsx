import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { BookOpen, Play, Waves, Atom, FlaskConical, Sigma } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

interface CourseProgress {
  courseId: string;
  code: string;
  name: string;
  progress: number; // 0-100
  lastStudied: string; // human readable
  tone: "violet" | "emerald" | "orange" | "sky" | "rose" | "amber";
}

const TONES: Record<
  CourseProgress["tone"],
  { iconBg: string; icon: string; bar: string; chip: string }
> = {
  violet:  { iconBg: "bg-violet-50",  icon: "text-violet-600",  bar: "bg-violet-500",  chip: "text-violet-700" },
  emerald: { iconBg: "bg-emerald-50", icon: "text-emerald-600", bar: "bg-emerald-500", chip: "text-emerald-700" },
  orange:  { iconBg: "bg-orange-50",  icon: "text-orange-600",  bar: "bg-orange-500",  chip: "text-orange-700" },
  sky:     { iconBg: "bg-sky-50",     icon: "text-sky-600",     bar: "bg-sky-500",     chip: "text-sky-700" },
  rose:    { iconBg: "bg-rose-50",    icon: "text-rose-600",    bar: "bg-rose-500",    chip: "text-rose-700" },
  amber:   { iconBg: "bg-amber-50",   icon: "text-amber-600",   bar: "bg-amber-500",   chip: "text-amber-700" },
};

const TONE_ORDER: CourseProgress["tone"][] = ["violet", "emerald", "orange", "sky", "rose", "amber"];

const iconForCode = (code: string) => {
  const c = code.toUpperCase();
  if (c.startsWith("MTH") || c.startsWith("MAT")) return Sigma;
  if (c.startsWith("PHY")) return Waves;
  if (c.startsWith("CHM") || c.startsWith("CHE")) return FlaskConical;
  if (c.startsWith("BIO")) return Atom;
  return BookOpen;
};

const timeAgo = (iso: string | null) => {
  if (!iso) return "Not started";
  const diff = Date.now() - new Date(iso).getTime();
  const day = 1000 * 60 * 60 * 24;
  if (diff < day) return "Last studied: Today";
  if (diff < 2 * day) return "Last studied: Yesterday";
  const days = Math.floor(diff / day);
  if (days < 7) return `Last studied: ${days} days ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 4) return `Last studied: ${weeks}w ago`;
  return `Last studied: ${new Date(iso).toLocaleDateString()}`;
};

/**
 * Continue Learning — horizontal cards showing per-course progress with a Resume CTA.
 * Progress is computed from the user's quiz_attempts grouped by course, using
 * the average accuracy of completed attempts as the proxy for mastery.
 */
export const ContinueLearning = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [items, setItems] = useState<CourseProgress[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("quiz_attempts")
        .select("correct_answers, total_questions, completed_at, started_at, quizzes(id, course_id, courses(id, code, name))")
        .eq("user_id", user.id)
        .not("completed_at", "is", null)
        .order("started_at", { ascending: false })
        .limit(80);

      if (cancelled) return;

      const byCourse = new Map<
        string,
        { code: string; name: string; correct: number; total: number; last: string }
      >();
      for (const a of (data ?? []) as any[]) {
        const c = a.quizzes?.courses;
        if (!c) continue;
        const cur = byCourse.get(c.id) ?? { code: c.code, name: c.name, correct: 0, total: 0, last: a.started_at };
        cur.correct += a.correct_answers || 0;
        cur.total += a.total_questions || 0;
        if (new Date(a.started_at) > new Date(cur.last)) cur.last = a.started_at;
        byCourse.set(c.id, cur);
      }

      const rows: CourseProgress[] = [...byCourse.entries()]
        .sort(([, a], [, b]) => new Date(b.last).getTime() - new Date(a.last).getTime())
        .slice(0, 6)
        .map(([courseId, v], i) => ({
          courseId,
          code: v.code,
          name: v.name,
          progress: v.total > 0 ? Math.min(100, Math.round((v.correct / v.total) * 100)) : 0,
          lastStudied: timeAgo(v.last),
          tone: TONE_ORDER[i % TONE_ORDER.length],
        }));

      setItems(rows);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  if (loading || items.length === 0) return null;

  return (
    <section aria-label="Continue learning" className="mb-6">
      <div className="flex items-end justify-between mb-3 px-0.5">
        <h2 className="font-display text-lg sm:text-xl font-bold tracking-tight text-foreground">
          Continue Learning
        </h2>
        <Link
          to="/my-courses"
          className="text-xs sm:text-sm font-semibold text-amber-700 hover:text-amber-800 transition-colors"
        >
          See all
        </Link>
      </div>

      <div className="-mx-4 px-4 sm:mx-0 sm:px-0">
        <div className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-thin">
          {items.map((it, i) => {
            const t = TONES[it.tone];
            const Icon = iconForCode(it.code);
            return (
              <motion.button
                key={it.courseId}
                type="button"
                onClick={() => navigate(`/my-courses?course=${it.courseId}`)}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: Math.min(i * 0.05, 0.3), ease: [0.22, 1, 0.36, 1] }}
                whileHover={{ y: -3 }}
                className="snap-start shrink-0 w-[78%] sm:w-[260px] text-left rounded-2xl border border-border/70 bg-card p-4 shadow-[0_4px_18px_-12px_rgba(0,0,0,0.12)] hover:shadow-[0_10px_24px_-12px_rgba(0,0,0,0.18)] transition-all"
              >
                <div className="flex items-start gap-3 mb-3">
                  <div className={`h-10 w-10 rounded-xl ${t.iconBg} flex items-center justify-center shrink-0`}>
                    <Icon className={`h-5 w-5 ${t.icon}`} strokeWidth={2} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-display text-[15px] font-bold text-foreground leading-tight truncate">
                      {it.code}
                    </div>
                    <div className="text-[11.5px] text-muted-foreground leading-tight truncate">
                      {it.name}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 mb-1.5">
                  <div className="h-1.5 flex-1 rounded-full bg-muted overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${it.progress}%` }}
                      transition={{ duration: 0.9, delay: 0.15 + i * 0.05, ease: [0.22, 1, 0.36, 1] }}
                      className={`h-full ${t.bar} rounded-full`}
                    />
                  </div>
                  <span className={`text-[11px] font-bold tabular-nums ${t.chip}`}>{it.progress}%</span>
                </div>

                <div className="flex items-center justify-between mt-3">
                  <span className="text-[11px] text-muted-foreground truncate">{it.lastStudied}</span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-muted text-[11px] font-bold text-foreground">
                    <Play className="h-3 w-3" /> Resume
                  </span>
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default ContinueLearning;
