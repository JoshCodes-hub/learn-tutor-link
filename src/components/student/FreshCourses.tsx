import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { BookOpen, Sparkles, ArrowRight, GraduationCap } from "lucide-react";

interface FreshCourse {
  id: string;
  code: string;
  name: string;
  department: string | null;
  level: string | null;
  created_at: string;
  created_by: string | null;
  creator?: { full_name: string | null; tutor_code: string | null } | null;
}

/**
 * FreshCourses — horizontal strip of the latest active courses (admin OR tutor).
 * Premium dashboard surface so new content is immediately discoverable.
 */
export const FreshCourses = () => {
  const [courses, setCourses] = useState<FreshCourse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const { data } = await supabase
        .from("courses")
        .select("id, code, name, department, level, created_at, created_by")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(8);

      if (cancelled || !data) {
        setLoading(false);
        return;
      }

      // Resolve creator names (best effort)
      const creatorIds = [...new Set(data.map((c) => c.created_by).filter(Boolean) as string[])];
      const creators: Record<string, { full_name: string | null; tutor_code: string | null }> = {};
      if (creatorIds.length > 0) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("id, full_name, tutor_code")
          .in("id", creatorIds);
        (profs ?? []).forEach((p: any) => {
          creators[p.id] = { full_name: p.full_name, tutor_code: p.tutor_code };
        });
      }

      const enriched = data.map((c: any) => ({
        ...c,
        creator: c.created_by ? creators[c.created_by] ?? null : null,
      }));

      if (!cancelled) {
        setCourses(enriched);
        setLoading(false);
      }
    };
    load();

    // Realtime — surface brand-new courses instantly
    const channel = supabase
      .channel("fresh-courses-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "courses" },
        () => load()
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, []);

  if (loading || courses.length === 0) return null;

  const isFresh = (iso: string) => Date.now() - new Date(iso).getTime() < 1000 * 60 * 60 * 24 * 7;

  return (
    <section aria-label="Fresh courses" className="mb-8">
      <div className="flex items-center justify-between mb-3 px-0.5">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-500" />
          <h2 className="font-display text-lg sm:text-xl font-bold text-foreground">Fresh Courses</h2>
        </div>
        <Link
          to="/my-courses"
          className="inline-flex items-center gap-1 text-xs sm:text-sm font-semibold text-amber-700 hover:text-amber-800 transition-colors"
        >
          Browse all <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      <div className="-mx-4 px-4 sm:mx-0 sm:px-0">
        <div
          className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-thin"
          style={{ scrollbarWidth: "thin" }}
        >
          {courses.map((c, i) => (
            <motion.div
              key={c.id}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: Math.min(i * 0.04, 0.32), ease: [0.22, 1, 0.36, 1] }}
              whileHover={{ y: -3 }}
              className="snap-start shrink-0 w-[78%] sm:w-[280px]"
            >
              <Link
                to="/my-courses"
                className="group block h-full rounded-2xl border border-amber-100 bg-gradient-to-br from-white via-amber-50/50 to-white p-4 shadow-sm hover:shadow-lg hover:border-amber-300 transition-all duration-300 relative overflow-hidden"
              >
                {/* Decorative gold corner */}
                <div className="pointer-events-none absolute -top-10 -right-10 w-24 h-24 rounded-full bg-amber-200/40 blur-2xl" />

                <div className="relative flex items-start justify-between gap-2 mb-3">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide bg-amber-500 text-white shadow-sm">
                    {c.code}
                  </span>
                  {isFresh(c.created_at) && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-700 border border-emerald-200">
                      <Sparkles className="w-2.5 h-2.5" /> NEW
                    </span>
                  )}
                </div>

                <h3 className="relative font-display font-bold text-[15px] text-foreground leading-snug line-clamp-2 mb-2 group-hover:text-amber-800 transition-colors">
                  {c.name}
                </h3>

                <div className="relative flex items-center justify-between text-[11px] text-muted-foreground">
                  <span className="flex items-center gap-1 truncate">
                    <BookOpen className="w-3 h-3 shrink-0" />
                    <span className="truncate">
                      {c.level ? `${c.level} Level` : "Any level"}
                      {c.department ? ` · ${c.department}` : ""}
                    </span>
                  </span>
                </div>

                {c.creator?.full_name && (
                  <div className="relative mt-2 pt-2 border-t border-amber-100/80 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    <GraduationCap className="w-3 h-3 text-amber-600" />
                    <span className="truncate">by {c.creator.full_name}</span>
                  </div>
                )}
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FreshCourses;
