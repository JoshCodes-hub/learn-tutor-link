import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { GraduationCap, Presentation, Users, ChevronRight, ArrowLeft } from "lucide-react";
import { SEO } from "@/components/seo/SEO";

type Intent = "student" | "tutor" | "parent";

const PERSONAS: { intent: Intent; icon: any; title: string; desc: string; tag?: string }[] = [
  { intent: "student", icon: GraduationCap, title: "I'm a Student", desc: "Practice CBT questions and ace your exams.", tag: "Free" },
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
        className="relative min-h-screen flex flex-col bg-background overflow-hidden"
        style={{ paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -left-20 w-[26rem] h-[26rem] rounded-full bg-primary/20 blur-3xl" />
          <div className="absolute -bottom-32 -right-20 w-[28rem] h-[28rem] rounded-full bg-accent/15 blur-3xl" />
        </div>

        <header className="relative z-10 flex items-center px-6 pt-5">
          <button onClick={() => navigate("/start")} aria-label="Back" className="p-2 -ml-2 rounded-full hover:bg-muted/50 transition">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <span className="ml-2 text-xs font-semibold tracking-[0.2em] text-muted-foreground uppercase">
            Step 2 of 2
          </span>
        </header>

        <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 text-center pb-8">
          <motion.h1
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            className="font-display text-4xl md:text-5xl font-bold tracking-tight leading-tight mb-3"
          >
            Which best
            <br />
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              describes you?
            </span>
          </motion.h1>
          <p className="text-muted-foreground max-w-sm mb-10 text-[15px]">
            We'll personalize your experience for the right journey.
          </p>

          <div className="w-full max-w-md space-y-3">
            {PERSONAS.map((p, i) => (
              <motion.button
                key={p.intent}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 + i * 0.08, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                onClick={() => pick(p.intent)}
                className="group relative w-full text-left p-4 rounded-2xl border border-border/60 bg-card/70 backdrop-blur-xl hover:border-primary/50 hover:shadow-xl hover:shadow-primary/10 hover:-translate-y-0.5 transition-all duration-300 active:scale-[0.98] flex items-center gap-4 overflow-hidden"
              >
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative w-12 h-12 rounded-xl bg-gradient-to-br from-primary/25 to-accent/20 p-[1px] shrink-0 shadow-md shadow-primary/15">
                  <div className="w-full h-full rounded-xl bg-card/90 flex items-center justify-center border border-primary/15">
                    <p.icon className="w-5 h-5 text-primary" strokeWidth={1.75} />
                  </div>
                </div>
                <div className="relative flex-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-display font-bold text-base">{p.title}</span>
                    {p.tag && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-primary/15 text-primary">
                        {p.tag}
                      </span>
                    )}
                  </div>
                  <div className="text-[13px] text-muted-foreground">{p.desc}</div>
                </div>
                <ChevronRight className="relative w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
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
