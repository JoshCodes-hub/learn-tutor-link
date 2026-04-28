import { Link } from "react-router-dom";
import { CheckCircle2, Circle, X, Lock, Sparkles, BookOpen, FileText, User, Banknote, Users2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useTutorOnboarding } from "@/hooks/useTutorOnboarding";
import { motion, AnimatePresence } from "framer-motion";

type Step = {
  key: keyof ReturnType<typeof useTutorOnboarding>["state"];
  title: string;
  description: string;
  icon: any;
  cta: { label: string; to?: string; onClick?: () => void };
  required: boolean;
};

export function OnboardingChecklist({
  onCreateCourse,
  onCreateQuiz,
  onCreateCommunity,
}: {
  onCreateCourse?: () => void;
  onCreateQuiz?: () => void;
  onCreateCommunity?: () => void;
}) {
  const { state, percent, completed, total, canPublishPaid, dismiss, loading } = useTutorOnboarding();

  if (loading) return null;
  if (state.dismissed && completed === total) return null;

  const steps: Step[] = [
    { key: "profile_completed", title: "Complete your profile", description: "Add your full name and a profile photo so students recognise you.", icon: User, cta: { label: "Edit profile", to: "/profile/edit" }, required: true },
    { key: "course_created", title: "Create your first course", description: "Group your questions and quizzes under a course.", icon: BookOpen, cta: { label: "Add course", onClick: onCreateCourse }, required: true },
    { key: "quiz_created", title: "Create your first quiz", description: "Build a quiz students can practise with.", icon: FileText, cta: { label: "Create quiz", onClick: onCreateQuiz }, required: true },
    { key: "bank_added", title: "Add bank details", description: "We need this so we can pay out your earnings.", icon: Banknote, cta: { label: "Add bank", to: "/profile/edit" }, required: true },
    { key: "community_created", title: "Launch a community", description: "Optional — invite your students into a private group.", icon: Users2, cta: { label: "Start community", onClick: onCreateCommunity }, required: false },
  ];

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <Card variant="elevated" className="overflow-hidden mb-6 border-primary/20">
          <div className="p-5 bg-gradient-to-br from-primary/10 via-background to-accent/5">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div className="flex items-start gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-primary/15 text-primary flex items-center justify-center shrink-0">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h2 className="font-display font-bold text-lg text-foreground">Tutor onboarding</h2>
                  <p className="text-xs text-muted-foreground">
                    Finish these steps to unlock paid quizzes and full earnings.
                  </p>
                </div>
              </div>
              {completed === total && (
                <Button variant="ghost" size="icon" onClick={dismiss} aria-label="Dismiss">
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>

            <div className="flex items-center gap-3 mb-1">
              <Progress value={percent} className="h-2 flex-1" />
              <span className="text-xs font-semibold text-muted-foreground tabular-nums">{completed}/{total}</span>
            </div>
            <div className={`text-[11px] font-semibold mt-2 inline-flex items-center gap-1 ${canPublishPaid ? "text-success" : "text-amber-600 dark:text-amber-400"}`}>
              {canPublishPaid ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
              {canPublishPaid ? "You can publish paid quizzes" : "Complete required steps to publish paid quizzes"}
            </div>
          </div>

          <div className="divide-y divide-border/50">
            {steps.map((s) => {
              const done = state[s.key];
              const Icon = s.icon;
              return (
                <div key={s.key} className="flex items-center gap-3 p-4 hover:bg-muted/30 transition-colors">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${done ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"}`}>
                    {done ? <CheckCircle2 className="w-5 h-5" /> : <Icon className="w-4 h-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className={`text-sm font-semibold ${done ? "text-muted-foreground line-through" : "text-foreground"}`}>{s.title}</p>
                      {s.required && !done && <span className="text-[9px] font-bold uppercase bg-amber-500/15 text-amber-700 dark:text-amber-400 px-1.5 py-0.5 rounded">required</span>}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{s.description}</p>
                  </div>
                  {!done && (
                    s.cta.to ? (
                      <Button asChild size="sm" variant="outline"><Link to={s.cta.to}>{s.cta.label}</Link></Button>
                    ) : (
                      <Button size="sm" variant="outline" onClick={s.cta.onClick}>{s.cta.label}</Button>
                    )
                  )}
                  {done && <Circle className="w-0 h-0" />}
                </div>
              );
            })}
          </div>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
}
