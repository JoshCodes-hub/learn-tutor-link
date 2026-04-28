import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { GraduationCap, Presentation, Users, ChevronRight, ArrowLeft } from "lucide-react";
import { SEO } from "@/components/seo/SEO";

type Intent = "student" | "tutor" | "parent";

const PERSONAS: { intent: Intent; icon: any; title: string; desc: string }[] = [
  { intent: "student", icon: GraduationCap, title: "I'm a Student", desc: "Practice CBT questions and ace your exams." },
  { intent: "tutor", icon: Presentation, title: "I'm a Tutor", desc: "Create quizzes, grow followers, earn tokens." },
  { intent: "parent", icon: Users, title: "I'm a Parent", desc: "Track your child's results and progress." },
];

const ChoosePersona = () => {
  const navigate = useNavigate();

  const pick = (intent: Intent) => {
    try {
      localStorage.setItem("signupIntent", intent);
    } catch {}
    navigate(`/auth?mode=signup&intent=${intent}`);
  };

  return (
    <>
      <SEO title="Choose your role" description="Tell us how you'll use OverraPrep." noindex url="/start/persona" />
      <div
        className="min-h-screen flex flex-col bg-gradient-to-br from-background via-background to-primary/5"
        style={{ paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <header className="flex items-center px-6 pt-4">
          <button onClick={() => navigate("/start")} aria-label="Back" className="p-2 -ml-2 rounded-full hover:bg-muted transition">
            <ArrowLeft className="w-5 h-5" />
          </button>
        </header>

        <main className="flex-1 flex flex-col items-center justify-center px-6 text-center">
          <motion.h1
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="font-display text-3xl font-bold tracking-tight mb-2"
          >
            Who are you?
          </motion.h1>
          <p className="text-muted-foreground max-w-xs mb-10">We'll set up your account for the right experience.</p>

          <div className="w-full max-w-sm space-y-3">
            {PERSONAS.map((p, i) => (
              <motion.button
                key={p.intent}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + i * 0.08, duration: 0.35 }}
                onClick={() => pick(p.intent)}
                className="group w-full text-left p-4 rounded-2xl border border-border/60 bg-card hover:border-primary/50 hover:shadow-md transition-all active:scale-[0.98] flex items-center gap-3"
              >
                <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <p.icon className="w-5 h-5 text-primary" strokeWidth={1.75} />
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-sm">{p.title}</div>
                  <div className="text-xs text-muted-foreground">{p.desc}</div>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition" />
              </motion.button>
            ))}
          </div>

          <button
            onClick={() => navigate("/auth?mode=signin")}
            className="mt-10 text-sm text-muted-foreground hover:text-foreground transition"
          >
            I already have an account →
          </button>
        </main>
      </div>
    </>
  );
};

export default ChoosePersona;
