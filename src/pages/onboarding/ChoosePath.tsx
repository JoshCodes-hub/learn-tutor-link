import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { GraduationCap, BookOpenCheck, School } from "lucide-react";
import { useAuth, AcademicPath } from "@/hooks/useAuth";
import { SEO } from "@/components/seo/SEO";
import { cn } from "@/lib/utils";
import { FEATURES } from "@/config/features";
import { toast } from "sonner";

const PATHS: {
  id: AcademicPath;
  title: string;
  tagline: string;
  description: string;
  icon: typeof School;
  accent: string;
}[] = [
  {
    id: "secondary",
    title: "Secondary School",
    tagline: "JSS1 – SS3 · WAEC / NECO",
    description: "Foundation learning, simplified explanations, and exam mastery for junior and senior secondary students.",
    icon: School,
    accent: "from-blue-500/20 to-blue-700/10 border-blue-500/30",
  },
  {
    id: "jamb",
    title: "JAMB / UTME",
    tagline: "Score the cut-off · Get admission",
    description: "Past-question intelligence, score predictor, and brutal CBT simulation tuned to real JAMB style.",
    icon: BookOpenCheck,
    accent: "from-amber-500/20 to-amber-700/10 border-amber-500/30",
  },
  {
    id: "university",
    title: "University Student",
    tagline: "100 – 500 Level",
    description: "CBT, theory grading, course survival kits, and AI-deep notes for every department.",
    icon: GraduationCap,
    accent: "from-emerald-500/20 to-emerald-700/10 border-emerald-500/30",
  },
];

export default function ChoosePath() {
  const navigate = useNavigate();
  const { profile } = useAuth();

  const handleChoose = (path: AcademicPath) => {
    if (path === "jamb" && !FEATURES.jamb) {
      toast.info("JAMB track is paused — we're focusing on University for now.");
      return;
    }
    sessionStorage.setItem("pending_academic_path", path);
    navigate("/onboarding/refine");
  };

  return (
    <>
      <SEO
        title="Choose Your Path | OverraPrep AI"
        description="Pick your academic path — Secondary, JAMB, or University — to unlock a personalized learning experience."
      />
      <main className="min-h-screen bg-background py-12 px-4">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <p className="text-sm uppercase tracking-[0.3em] text-primary mb-3">
              Welcome{profile?.full_name ? `, ${profile.full_name.split(" ")[0]}` : ""}
            </p>
            <h1 className="font-display text-4xl md:text-5xl font-bold mb-4">
              What are you preparing for?
            </h1>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Your choice shapes everything you see — content, AI tone, recommendations, and difficulty.
              You can change this later in your profile.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-5">
            {PATHS.map((path, i) => {
              const Icon = path.icon;
              const disabled = path.id === "jamb" && !FEATURES.jamb;
              return (
                <motion.button
                  key={path.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 + i * 0.08 }}
                  whileHover={disabled ? undefined : { y: -4 }}
                  onClick={() => handleChoose(path.id)}
                  disabled={disabled}
                  className={cn(
                    "group relative text-left rounded-2xl border bg-gradient-to-br p-6 transition-all",
                    "hover:shadow-2xl hover:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary",
                    path.accent,
                    disabled && "opacity-60 cursor-not-allowed hover:shadow-none hover:border-inherit"
                  )}
                >
                  {disabled && (
                    <span className="absolute top-3 right-3 text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-foreground/10 text-foreground/70">
                      Coming soon
                    </span>
                  )}
                  <div className="w-14 h-14 rounded-xl bg-card/80 backdrop-blur flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <Icon className="w-7 h-7 text-foreground" />
                  </div>
                  <h2 className="font-display text-xl font-bold mb-1">{path.title}</h2>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground mb-3">
                    {path.tagline}
                  </p>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {path.description}
                  </p>
                </motion.button>
              );
            })}
          </div>
        </div>
      </main>
    </>
  );
}
