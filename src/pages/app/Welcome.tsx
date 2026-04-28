import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { Sparkles, GraduationCap, Presentation, Building2, ChevronRight } from "lucide-react";
import logo from "@/assets/logo.png";
import { SEO } from "@/components/seo/SEO";

/**
 * Native-style welcome screen (replaces the marketing landing).
 * Signed-in users are redirected to their role home.
 */
const Welcome = () => {
  const navigate = useNavigate();
  const { user, primaryRole, isLoading } = useAuth();

  useEffect(() => {
    if (isLoading) return;
    if (!user) return;
    if (primaryRole === "admin") navigate("/admin/dashboard", { replace: true });
    else if (primaryRole === "tutor") navigate("/tutor/dashboard", { replace: true });
    else if ((primaryRole as any) === "school_owner") navigate("/school/dashboard", { replace: true });
    else if (primaryRole === "student") navigate("/student/dashboard", { replace: true });
  }, [user, primaryRole, isLoading, navigate]);

  return (
    <>
      <SEO title="Welcome" description="OverraPrep AI — the smart learning and school management app." noindex url="/" />
      <div
        className="min-h-screen flex flex-col bg-gradient-to-br from-background via-background to-primary/5"
        style={{ paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <main className="flex-1 flex flex-col items-center justify-center px-6 text-center">
          <motion.img
            initial={{ opacity: 0, y: 16, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.5 }}
            src={logo}
            alt="OverraPrep AI"
            className="h-20 w-auto mb-8 drop-shadow-xl"
          />
          <motion.h1
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.4 }}
            className="font-display text-3xl font-bold tracking-tight mb-3"
          >
            Welcome to OverraPrep
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.4 }}
            className="text-muted-foreground max-w-xs mb-10 leading-relaxed"
          >
            Your AI study partner for University exams — and the complete school management app for Nigerian schools.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.4 }}
            className="w-full max-w-xs space-y-3"
          >
            <Button size="lg" className="w-full h-12 rounded-2xl" onClick={() => navigate("/auth")}>
              <Sparkles className="w-4 h-4 mr-2" /> Get started
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="w-full h-12 rounded-2xl"
              onClick={() => navigate("/auth?mode=signin")}
            >
              I already have an account
            </Button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.45, duration: 0.4 }}
            className="mt-10 grid grid-cols-3 gap-2 w-full max-w-sm"
          >
            <PersonaTile
              icon={GraduationCap}
              label="I'm a student"
              hint="Ace exams"
              onClick={() => navigate("/auth?intent=student")}
            />
            <PersonaTile
              icon={Presentation}
              label="I'm a tutor"
              hint="Teach & earn"
              onClick={() => navigate("/auth?intent=tutor")}
            />
            <PersonaTile
              icon={Building2}
              label="I run a school"
              hint="Register"
              onClick={() => navigate("/school/register")}
            />
          </motion.div>
        </main>
        <footer className="text-center text-[10px] text-muted-foreground pb-4">
          Made for Nigerian schools & students · v1.0
        </footer>
      </div>
    </>
  );
};

export default Welcome;

const PersonaTile = ({ icon: Icon, label, hint, onClick }: { icon: any; label: string; hint: string; onClick: () => void }) => (
  <button
    onClick={onClick}
    className="group p-3 rounded-2xl border border-border/60 bg-card hover:border-primary/40 hover:shadow-md transition-all text-left active:scale-95"
  >
    <Icon className="w-5 h-5 text-primary mb-2" strokeWidth={1.75} />
    <div className="text-xs font-semibold leading-tight">{label}</div>
    <div className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-0.5">
      {hint} <ChevronRight className="w-3 h-3" />
    </div>
  </button>
);
