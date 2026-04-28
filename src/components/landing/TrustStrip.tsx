import { motion } from "framer-motion";
import { Brain, ShieldCheck, Gauge, Sparkles, GraduationCap } from "lucide-react";

const items = [
  { icon: Gauge, label: "Exam-Readiness Score", detail: "Live mastery tracking" },
  { icon: Brain, label: "AI Step-by-Step Explanations", detail: "Every question, every line" },
  { icon: ShieldCheck, label: "Admin-Verified Tutors", detail: "Vetted before they teach" },
  { icon: Sparkles, label: "Theory Rubric Grading", detail: "Beyond multiple choice" },
  { icon: GraduationCap, label: "Built for FUTA & beyond", detail: "JAMB, WAEC, NECO ready" },
];

const TrustStrip = () => {
  return (
    <section
      className="relative border-y border-primary/15 bg-gradient-to-b from-background via-background to-muted/20"
      aria-label="Why students trust OverraPrep"
    >
      {/* Faint gold divider above */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-x-4 gap-y-3.5 md:gap-6">
          {items.map((item, i) => (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ delay: i * 0.08, duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
              className="group flex items-center gap-3 min-w-0"
            >
              <div className="shrink-0 w-10 h-10 md:w-11 md:h-11 rounded-xl bg-gradient-to-br from-primary/15 via-primary/5 to-transparent border border-primary/25 flex items-center justify-center group-hover:border-primary/50 transition-colors">
                <item.icon className="w-4 h-4 md:w-5 md:h-5 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[12.5px] md:text-[13px] font-semibold text-foreground leading-tight">
                  {item.label}
                </p>
                <p className="text-[11px] text-muted-foreground leading-snug mt-0.5">
                  {item.detail}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Faint gold divider below */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
    </section>
  );
};

export default TrustStrip;
