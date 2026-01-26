import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";
import heroStudent from "@/assets/hero-student.jpg";

const HeroSection = () => {
  const navigate = useNavigate();

  return (
    <section className="relative w-full overflow-hidden" aria-label="Hero section">
      {/* Background image container */}
      <div className="absolute inset-0">
        <img 
          src={heroStudent} 
          alt="Student studying with OverraPrep AI" 
          className="w-full h-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/30" />
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col justify-end min-h-[500px] sm:min-h-[550px] px-6 sm:px-8 lg:px-12 pt-24 pb-10 sm:pb-12">
        {/* Trust badge - positioned top right */}
        <motion.div 
          className="absolute top-24 right-6 sm:right-8 lg:right-12"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="flex items-center gap-2 bg-white/15 backdrop-blur-sm border border-white/20 rounded-full px-3 py-1.5 sm:px-4 sm:py-2">
            <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-primary flex items-center justify-center">
              <CheckCircle2 className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-primary-foreground" />
            </div>
            <span className="text-xs sm:text-sm font-medium text-white">
              Trusted by <span className="font-bold">FUTA Students</span>
            </span>
          </div>
        </motion.div>

        {/* Main content */}
        <div className="space-y-4 sm:space-y-5">
          {/* Headline */}
          <motion.h1 
            className="font-display text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
          >
            FUTA CBTs<br />
            Made Easy
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            className="text-white/80 text-sm sm:text-base max-w-sm"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.5 }}
          >
            Practice with AI-powered quizzes and ace your exams with confidence.
          </motion.p>

          {/* CTA Button */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.5 }}
          >
            <Button 
              size="lg"
              className="h-12 px-6 text-base font-semibold bg-primary hover:bg-primary/90 text-primary-foreground rounded-full shadow-lg shadow-primary/30"
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
