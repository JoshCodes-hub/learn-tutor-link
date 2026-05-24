import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Briefcase, GraduationCap, Trophy, Compass, ArrowRight, type LucideIcon } from "lucide-react";

interface OpportunityCard {
  icon: LucideIcon;
  label: string;
  hint: string;
}

const CARDS: OpportunityCard[] = [
  { icon: Briefcase,      label: "Internships",  hint: "Build experience" },
  { icon: GraduationCap,  label: "Scholarships", hint: "Fund your studies" },
  { icon: Trophy,         label: "Hackathons",   hint: "Compete & learn" },
  { icon: Compass,        label: "Opportunities", hint: "Discover more" },
];

interface Props {
  university?: string;
}

/**
 * Calm 2x2 grid placeholder for the Opportunity Hub.
 * Structured for future university-scoped filtering — no data fetching yet.
 */
export const OpportunityHubPreview = ({ university = "FUTA" }: Props) => {
  const navigate = useNavigate();

  return (
    <section aria-label="Opportunity hub" className="mb-7">
      <div className="flex items-end justify-between mb-3 px-0.5">
        <div>
          <h2 className="font-display text-[15px] sm:text-base font-bold tracking-tight text-foreground">
            Opportunity Hub
          </h2>
          <p className="text-[11.5px] text-muted-foreground mt-0.5">
            Curated for {university} students
          </p>
        </div>
        <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-amber-50 border border-amber-200/70 text-amber-800">
          Coming soon
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
        {CARDS.map((c, i) => {
          const Icon = c.icon;
          return (
            <motion.button
              key={c.label}
              type="button"
              onClick={() => navigate("/coming-soon")}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: i * 0.04, ease: [0.22, 1, 0.36, 1] }}
              whileTap={{ scale: 0.98 }}
              className="group relative flex items-start gap-3 rounded-2xl border border-amber-100/70 bg-card p-4 min-h-[80px] text-left hover:border-amber-200 hover:shadow-[0_6px_18px_-10px_rgba(180,140,40,0.25)] transition-all"
              aria-label={c.label}
            >
              <span className="h-9 w-9 rounded-lg bg-amber-50 border border-amber-100 flex items-center justify-center shrink-0">
                <Icon className="h-[18px] w-[18px] text-amber-700" strokeWidth={2} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-display text-[13.5px] font-bold text-foreground leading-tight">
                  {c.label}
                </span>
                <span className="block text-[11.5px] text-muted-foreground mt-0.5 truncate">
                  {c.hint}
                </span>
              </span>
              <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/40 mt-1 group-hover:text-amber-700 transition-colors" />
            </motion.button>
          );
        })}
      </div>
    </section>
  );
};

export default OpportunityHubPreview;