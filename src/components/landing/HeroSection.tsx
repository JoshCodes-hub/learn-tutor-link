import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";
import heroStudent from "@/assets/hero-student.jpg";

const HeroSection = () => {
  const navigate = useNavigate();

  return (
    <section className="relative min-h-[85vh] sm:min-h-[80vh] w-full overflow-hidden" aria-label="Hero section">
      {/* Full-screen background image */}
      <div className="absolute inset-0">
        <img 
          src={heroStudent} 
          alt="Student studying with OverraPrep AI" 
          className="w-full h-full object-cover object-top"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-black/20" />
      </div>

      {/* Content */}
      <div className="relative z-10 h-full flex flex-col justify-between px-6 sm:px-8 lg:px-12 py-20 sm:py-24">
        {/* Top - Trust badge */}
        <motion.div 
          className="flex justify-end"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="flex items-center gap-2 bg-white/15 backdrop-blur-sm border border-white/20 rounded-full px-4 py-2">
            <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
              <CheckCircle2 className="w-3 h-3 text-primary-foreground" />
            </div>
            <span className="text-sm font-medium text-white">
              Trusted by <span className="font-bold">FUTA Students</span>
            </span>
          </div>
        </motion.div>

        {/* Bottom - Main content */}
        <div className="space-y-6">
          {/* Headline */}
          <motion.h1 
            className="font-display text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white leading-tight"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
          >
            FUTA CBTs<br />
            Made Easy
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            className="text-white/80 text-base sm:text-lg max-w-md"
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
              className="h-14 px-8 text-lg font-semibold bg-primary hover:bg-primary/90 text-primary-foreground rounded-full shadow-lg shadow-primary/30"
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
