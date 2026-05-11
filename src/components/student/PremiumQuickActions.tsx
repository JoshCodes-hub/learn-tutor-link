import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Play, Timer, ShoppingBag, Target, ArrowRight } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface ResumeQuiz {
  id: string;
  quiz_id: string;
  title: string | null;
}

/**
 * Premium dashboard quick actions — four polished, animated shortcuts
 * that deep-link into the most-used study flows.
 */
export const PremiumQuickActions = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [resume, setResume] = useState<ResumeQuiz | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("quiz_attempts")
        .select("id, quiz_id, quizzes(title)")
        .eq("user_id", user.id)
        .is("completed_at", null)
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (cancelled || !data) return;
      setResume({
        id: data.id,
        quiz_id: data.quiz_id,
        title: (data as any).quizzes?.title ?? null,
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const actions = [
    {
      key: "resume",
      title: resume ? "Resume last quiz" : "No quiz in progress",
      subtitle: resume?.title || "Start a new one anytime",
      icon: Play,
      onClick: () => navigate(resume ? `/quiz/${resume.quiz_id}` : "/student/dashboard"),
      gradient: "from-amber-400 via-amber-500 to-amber-600",
      disabled: !resume,
    },
    {
      key: "cbt",
      title: "Start CBT simulation",
      subtitle: "Mock exam in real time",
      icon: Timer,
      onClick: () => navigate("/exams"),
      gradient: "from-emerald-400 via-emerald-500 to-emerald-600",
    },
    {
      key: "buy",
      title: "Buy tutor quiz",
      subtitle: "Premium prep packs",
      icon: ShoppingBag,
      onClick: () => navigate("/tutor-marketplace"),
      gradient: "from-violet-400 via-violet-500 to-violet-600",
    },
    {
      key: "weak",
      title: "Practice weak topic",
      subtitle: "Targeted drill mode",
      icon: Target,
      onClick: () => navigate("/student/weak-area-drill"),
      gradient: "from-rose-400 via-rose-500 to-rose-600",
    },
  ];

  return (
    <section aria-label="Quick actions" className="mb-5">
      <div className="flex items-center justify-between mb-2.5 px-0.5">
        <h2 className="font-display text-base font-bold text-foreground">Quick actions</h2>
        <span className="text-[11px] text-muted-foreground">Tap to jump in</span>
      </div>
      <div className="grid grid-cols-2 gap-2.5">
        {actions.map((a, i) => (
          <motion.button
            key={a.key}
            type="button"
            onClick={a.onClick}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: i * 0.04 }}
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.97 }}
            disabled={a.disabled}
            className={cn(
              "group relative overflow-hidden rounded-2xl border border-amber-100/70 bg-white p-3 text-left shadow-[0_4px_14px_-8px_rgba(180,140,40,0.25)] transition disabled:opacity-60 disabled:cursor-not-allowed"
            )}
          >
            <div className="flex items-start gap-2.5">
              <span
                className={cn(
                  "shrink-0 h-9 w-9 rounded-xl bg-gradient-to-br text-white flex items-center justify-center shadow-sm",
                  a.gradient
                )}
              >
                <a.icon className="h-4.5 w-4.5" strokeWidth={2.2} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-bold leading-tight truncate text-foreground">
                  {a.title}
                </p>
                <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">
                  {a.subtitle}
                </p>
              </div>
              <ArrowRight className="h-3.5 w-3.5 text-amber-600/70 mt-1 group-hover:translate-x-0.5 transition" />
            </div>
          </motion.button>
        ))}
      </div>
    </section>
  );
};

export default PremiumQuickActions;
