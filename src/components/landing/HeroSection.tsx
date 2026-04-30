import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight, GraduationCap, School, BookOpen, Sparkles, ShieldCheck } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import heroEditorial from "@/assets/hero-editorial.jpg";
import heroCollab from "@/assets/hero-collab.jpg";
import heroStudyDetail from "@/assets/hero-study-detail.jpg";

type Role = "student" | "tutor" | "school";

/**
 * Each slide carries:
 * - Its own per-breakpoint focal point (so the subject's face stays in frame on mobile/tablet/desktop)
 * - A synced "highlight" word that swaps inside the headline as the photo crossfades
 * - A synced editorial sub-line
 */
const heroSlides = [
  {
    src: heroEditorial,
    // Subject is right side → push focal right on mobile, center on desktop
    focal: "object-[78%_30%] sm:object-[72%_30%] md:object-[65%_35%] lg:object-[60%_35%]",
    highlight: "Practice.",
    sub: "AI-graded CBT drills, instant explanations, real exam pacing.",
  },
  {
    src: heroCollab,
    // Two subjects centered → keep tighter framing on mobile
    focal: "object-[55%_45%] sm:object-[50%_42%] md:object-[50%_40%]",
    highlight: "Together.",
    sub: "Verified tutors, study teams and live mentorship that move you forward.",
  },
  {
    src: heroStudyDetail,
    // Detail shot — keep notebook in frame
    focal: "object-[55%_55%] sm:object-[58%_52%] md:object-[60%_50%]",
    highlight: "Mastery.",
    sub: "Theory rubrics, weak-area drills and an exam-readiness score you can trust.",
  },
];

const roleConfig: Record<Role, { label: string; icon: typeof BookOpen; path: string; cta: string }> = {
  student: { label: "Student", icon: BookOpen, path: "/auth?mode=signup&role=student", cta: "Start Practising — Free" },
  tutor: { label: "Tutor", icon: GraduationCap, path: "/apply-tutor", cta: "Apply to Teach" },
  school: { label: "School", icon: School, path: "/school/register", cta: "Register your School" },
};

const HeroSection = () => {
  const navigate = useNavigate();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [selectedRole, setSelectedRole] = useState<Role>("student");

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % heroSlides.length);
    }, 6000);
    return () => clearInterval(interval);
  }, []);

  const slide = heroSlides[currentImageIndex];
  const ActiveRoleCta = roleConfig[selectedRole];

  return (
    <section className="relative w-full overflow-hidden" aria-label="Hero section">
      {/* Background images — smooth crossfade + slow Ken Burns */}
      <div className="absolute inset-0">
        <AnimatePresence mode="sync">
          <motion.img
            key={currentImageIndex}
            src={slide.src}
            alt="Students preparing with OverraPrep AI"
            className={`absolute inset-0 w-full h-full object-cover ${slide.focal}`}
            initial={{ opacity: 0, scale: 1.12 }}
            animate={{
              opacity: 1,
              scale: 1.0,
              transition: {
                opacity: { duration: 1.6, ease: [0.4, 0, 0.2, 1] },
                scale: { duration: 7, ease: "linear" },
              },
            }}
            exit={{ opacity: 0, transition: { duration: 1.4, ease: "easeInOut" } }}
          />
        </AnimatePresence>

        {/* Editorial gradient stack */}
        <div className="absolute inset-0 bg-gradient-to-t from-[hsl(220,40%,6%)] via-[hsl(220,30%,8%,0.72)] to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-[hsl(220,40%,6%,0.7)] via-[hsl(220,30%,8%,0.25)] to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_60%,transparent_30%,hsl(220,40%,5%,0.55)_100%)]" />
        {/* Gold accent line */}
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/70 to-transparent" />
      </div>

      {/* Slide indicators */}
      <div className="absolute bottom-6 sm:bottom-8 right-4 sm:right-8 z-20 flex gap-1.5">
        {heroSlides.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentImageIndex(index)}
            className={`h-[3px] rounded-full transition-all duration-700 ${
              index === currentImageIndex ? "bg-primary w-10" : "bg-white/35 w-4 hover:bg-white/60"
            }`}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>

      {/* Trust badge — desktop only (never overlaps faces on mobile) */}
      <motion.div
        className="hidden lg:flex absolute top-24 right-8 lg:right-12 z-20"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.6 }}
      >
        <div className="flex items-center gap-2 bg-background/15 backdrop-blur-xl border border-primary/25 rounded-full px-4 py-2 shadow-lg shadow-black/20">
          <ShieldCheck className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium text-white tracking-wide">
            Trusted by <span className="font-semibold text-primary">FUTA</span> students
          </span>
        </div>
      </motion.div>

      {/* Content */}
      <div className="relative z-10 flex flex-col justify-end min-h-[680px] sm:min-h-[700px] md:min-h-[720px] lg:min-h-[760px] px-5 sm:px-8 lg:px-12 pt-24 pb-14 sm:pb-16">
        <div className="max-w-3xl space-y-5 sm:space-y-6">
          {/* Eyebrow */}
          <motion.p
            className="text-primary font-medium text-xs sm:text-sm tracking-[0.22em] uppercase flex items-center gap-2"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.5 }}
          >
            <span className="h-px w-8 bg-primary/60" />
            AI-Powered Excellence
          </motion.p>

          {/* Headline — bold, modern, no italic display swap */}
          <motion.h1
            className="text-[2.5rem] leading-[1.05] sm:text-5xl md:text-6xl lg:text-[4.75rem] font-bold text-white tracking-tight"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.55 }}
          >
            Prepare Smarter.
            <br />
            <span className="text-gradient-primary">Perform Better.</span>
          </motion.h1>

          {/* Static, clear subtext */}
          <motion.p
            className="text-white/80 text-base sm:text-lg leading-relaxed font-light max-w-xl"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45, duration: 0.55 }}
          >
            AI-powered exam preparation system for university students.
          </motion.p>

          {/* Rotating context line (kept subtle, no big highlight word) */}
          <div className="h-6 max-w-xl">
            <AnimatePresence mode="wait">
              <motion.p
                key={slide.sub}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.5 }}
                className="text-white/55 text-xs sm:text-sm tracking-wide"
              >
                {slide.sub}
              </motion.p>
            </AnimatePresence>
          </div>

          {/* 30-second registration block — role picker FIRST, CTA adapts */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.55, duration: 0.5 }}
            className="space-y-3 pt-1"
          >
            <p className="text-[10.5px] sm:text-[11px] uppercase tracking-[0.22em] text-white/55 font-medium">
              I'm joining as
            </p>

            {/* Role picker */}
            <div className="flex flex-wrap gap-2">
              {(Object.keys(roleConfig) as Role[]).map((role) => {
                const cfg = roleConfig[role];
                const Icon = cfg.icon;
                const active = selectedRole === role;
                return (
                  <button
                    key={role}
                    onClick={() => setSelectedRole(role)}
                    className={`group flex items-center gap-2 backdrop-blur-md rounded-full pl-2 pr-4 py-1.5 transition-all active:scale-95 border ${
                      active
                        ? "bg-primary/25 border-primary/60 shadow-lg shadow-primary/20"
                        : "bg-white/8 border-white/15 hover:bg-white/12 hover:border-white/30"
                    }`}
                    aria-pressed={active}
                  >
                    <span
                      className={`w-6 h-6 rounded-full flex items-center justify-center transition-colors ${
                        active ? "bg-primary text-primary-foreground" : "bg-primary/20 text-primary"
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                    </span>
                    <span className="text-xs sm:text-sm font-medium text-white">{cfg.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Adaptive primary CTA + Sign in */}
            <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
              <Button
                size="lg"
                className="h-12 sm:h-13 px-7 sm:px-8 text-sm sm:text-base font-semibold bg-primary hover:bg-primary/90 text-primary-foreground rounded-full shadow-xl shadow-primary/30 active:scale-[0.97] transition-all w-full sm:w-auto"
                onClick={() => navigate(ActiveRoleCta.path)}
              >
                {ActiveRoleCta.cta}
                <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
              <Button
                variant="ghost"
                size="lg"
                className="h-12 sm:h-13 px-6 text-white/85 hover:text-white hover:bg-white/10 rounded-full border border-white/20 w-full sm:w-auto"
                onClick={() => navigate("/auth")}
              >
                Sign In
              </Button>
            </div>

            {/* Trust micro-row */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 pt-2 text-[11px] sm:text-xs text-white/65">
              <span className="inline-flex items-center gap-1.5">
                <Sparkles className="w-3 h-3 text-primary" /> Free to start — no card
              </span>
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck className="w-3 h-3 text-primary" /> Admin-verified tutors
              </span>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
