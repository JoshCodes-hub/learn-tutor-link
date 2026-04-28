import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { GraduationCap, Building2, ChevronRight, ArrowLeft } from "lucide-react";
import logo from "@/assets/logo.png";
import { SEO } from "@/components/seo/SEO";

const ChooseProduct = () => {
  const navigate = useNavigate();

  return (
    <>
      <SEO title="Choose your path" description="Pick the OverraPrep product that fits you." noindex url="/start" />
      <div
        className="min-h-screen flex flex-col bg-gradient-to-br from-background via-background to-primary/5"
        style={{ paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <header className="flex items-center justify-between px-6 pt-4">
          <button onClick={() => navigate("/")} aria-label="Back" className="p-2 -ml-2 rounded-full hover:bg-muted transition">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <img src={logo} alt="OverraPrep" className="h-7 w-auto" />
          <div className="w-8" />
        </header>

        <main className="flex-1 flex flex-col items-center justify-center px-6 text-center">
          <motion.h1
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="font-display text-3xl font-bold tracking-tight mb-2"
          >
            What brings you here?
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.4 }}
            className="text-muted-foreground max-w-xs mb-10"
          >
            Pick a product to get started. You can always switch later.
          </motion.p>

          <div className="w-full max-w-sm space-y-4">
            <ProductCard
              delay={0.15}
              icon={GraduationCap}
              title="University & Exam Prep"
              subtitle="For students, tutors, and parents preparing for CBT exams."
              tag="Most popular"
              onClick={() => navigate("/start/persona")}
            />
            <ProductCard
              delay={0.25}
              icon={Building2}
              title="School Management"
              subtitle="For school owners running attendance, fees, results & more."
              onClick={() => navigate("/school/intro")}
            />
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

const ProductCard = ({
  icon: Icon,
  title,
  subtitle,
  tag,
  onClick,
  delay,
}: {
  icon: any;
  title: string;
  subtitle: string;
  tag?: string;
  onClick: () => void;
  delay: number;
}) => (
  <motion.button
    initial={{ opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.4 }}
    onClick={onClick}
    className="group w-full text-left p-5 rounded-2xl border border-border/60 bg-card hover:border-primary/50 hover:shadow-lg transition-all active:scale-[0.98]"
  >
    <div className="flex items-start gap-4">
      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
        <Icon className="w-6 h-6 text-primary" strokeWidth={1.75} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <h3 className="font-semibold">{title}</h3>
          {tag && (
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-primary/15 text-primary">
              {tag}
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">{subtitle}</p>
      </div>
      <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition" />
    </div>
  </motion.button>
);

export default ChooseProduct;
