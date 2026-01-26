import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";
import heroStudent from "@/assets/hero-student.jpg";

const HeroSection = () => {
  const navigate = useNavigate();

  return (
    <section className="relative w-full overflow-hidden" aria-label="Hero section">
      {/* Background image - optimized for mobile */}
      <div className="absolute inset-0">
        <img 
          src={heroStudent} 
          alt="Student studying with OverraPrep AI" 
          className="w-full h-full object-cover object-[center_20%]"
        />
        {/* Stronger gradient for better text readability on mobile */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-black/20" />
      </div>

      {/* Content - compact for mobile, comfortable for desktop */}
      <div className="relative z-10 flex flex-col justify-end min-h-[420px] sm:min-h-[480px] md:min-h-[520px] px-5 sm:px-8 lg:px-12 pt-20 pb-8 sm:pb-10">
        {/* Trust badge - top right with safe area padding */}
        <motion.div 
          className="absolute top-20 sm:top-24 right-4 sm:right-8 lg:right-12"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
        >
          <div className="flex items-center gap-1.5 sm:gap-2 bg-white/20 backdrop-blur-md border border-white/30 rounded-full px-2.5 py-1 sm:px-3 sm:py-1.5">
            <div className="w-4 h-4 rounded-full bg-primary flex items-center justify-center">
              <CheckCircle2 className="w-2.5 h-2.5 text-primary-foreground" />
            </div>
            <span className="text-[10px] sm:text-xs font-medium text-white">
              Trusted by <span className="font-bold">FUTA</span>
            </span>
          </div>
        </motion.div>

        {/* Main content - optimized spacing for Android */}
        <div className="space-y-3 sm:space-y-4">
          {/* Headline - punchy and readable */}
          <motion.h1 
            className="font-display text-[2rem] leading-[1.1] sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.4 }}
          >
            FUTA CBTs<br />
            <span className="text-primary">Made Easy</span>
          </motion.h1>

          {/* Subtitle - concise */}
          <motion.p
            className="text-white/85 text-sm sm:text-base max-w-xs sm:max-w-sm leading-relaxed"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.4 }}
          >
            Practice with AI-powered quizzes and ace your exams.
          </motion.p>

          {/* CTA Button - prominent and touch-friendly */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.4 }}
            className="pt-1"
          >
            <Button 
              size="lg"
              className="h-11 sm:h-12 px-6 sm:px-8 text-sm sm:text-base font-semibold bg-primary hover:bg-primary/90 text-primary-foreground rounded-full shadow-xl shadow-primary/40 active:scale-95 transition-transform"
              onClick={() => navigate("/auth")}
            >
              Start Learning Now
            </Button>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
