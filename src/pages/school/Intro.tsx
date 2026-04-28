import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Building2, ClipboardCheck, Wallet, Megaphone, Users, ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SEO } from "@/components/seo/SEO";

const FEATURES = [
  { icon: Users, label: "Students & Classes" },
  { icon: ClipboardCheck, label: "Attendance & Results" },
  { icon: Wallet, label: "Fees & Payments" },
  { icon: Megaphone, label: "Announcements" },
];

const SchoolIntro = () => {
  const navigate = useNavigate();

  const start = () => {
    navigate(`/auth?mode=signup&intent=school_owner&redirect=${encodeURIComponent("/school/register")}`);
  };

  return (
    <>
      <SEO title="School Management" description="Run your school end-to-end with OverraPrep." noindex url="/school/intro" />
      <div
        className="min-h-screen flex flex-col bg-gradient-to-br from-background via-background to-accent/5"
        style={{ paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <header className="flex items-center px-6 pt-4">
          <button onClick={() => navigate("/start")} aria-label="Back" className="p-2 -ml-2 rounded-full hover:bg-muted transition">
            <ArrowLeft className="w-5 h-5" />
          </button>
        </header>

        <main className="flex-1 flex flex-col items-center justify-center px-6 text-center">
          <motion.div
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.4 }}
            className="w-20 h-20 rounded-3xl bg-gradient-to-br from-primary/30 to-accent/30 flex items-center justify-center mb-6 shadow-xl"
          >
            <Building2 className="w-10 h-10 text-primary" strokeWidth={1.5} />
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.4 }}
            className="font-display text-3xl font-bold tracking-tight mb-3 max-w-xs"
          >
            Your school in one app
          </motion.h1>
          <p className="text-muted-foreground max-w-sm mb-8 leading-relaxed">
            Register your school and get attendance, results, fees, and announcements — built for Nigerian schools.
          </p>

          <div className="grid grid-cols-2 gap-3 w-full max-w-sm mb-10">
            {FEATURES.map((f, i) => (
              <motion.div
                key={f.label}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 + i * 0.06, duration: 0.3 }}
                className="p-3 rounded-xl border border-border/60 bg-card flex items-center gap-2"
              >
                <f.icon className="w-4 h-4 text-primary shrink-0" strokeWidth={1.75} />
                <span className="text-xs font-medium text-left">{f.label}</span>
              </motion.div>
            ))}
          </div>

          <div className="w-full max-w-sm space-y-3">
            <Button size="lg" className="w-full h-12 rounded-2xl" onClick={start}>
              Register my school <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="w-full h-12 rounded-2xl"
              onClick={() => navigate("/auth?mode=signin")}
            >
              I already have an account
            </Button>
          </div>
        </main>
      </div>
    </>
  );
};

export default SchoolIntro;
