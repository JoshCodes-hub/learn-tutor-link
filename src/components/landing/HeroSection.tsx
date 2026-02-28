import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight, Award } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import heroStudent from "@/assets/hero-student.jpg";
import studentsHero from "@/assets/students-hero.jpg";
import studentFemale from "@/assets/student-female.jpg";
import studentMale from "@/assets/student-male.jpg";
import studentsGroup from "@/assets/students-group.jpg";

const heroImages = [heroStudent, studentsHero, studentFemale, studentMale, studentsGroup];

const HeroSection = () => {
  const navigate = useNavigate();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % heroImages.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="relative w-full overflow-hidden" aria-label="Hero section">
      {/* Background images */}
      <div className="absolute inset-0">
        <AnimatePresence mode="popLayout">
          <motion.img
            key={currentImageIndex}
            src={heroImages[currentImageIndex]}
            alt="Students studying with OverraPrep AI"
            className="absolute inset-0 w-full h-full object-cover object-[center_20%]"
            initial={{ opacity: 0, scale: 1.1 }}
            animate={{ 
              opacity: 1, 
              scale: 1.03,
              transition: {
                opacity: { duration: 1.2, ease: "easeInOut" },
                scale: { duration: 5, ease: "easeOut" }
              }
            }}
            exit={{ opacity: 0, transition: { duration: 1 } }}
          />
        </AnimatePresence>
        {/* Luxury gold-tinted overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-[hsl(30,20%,6%)] via-[hsl(30,15%,8%,0.65)] to-[hsl(43,30%,15%,0.3)]" />
        {/* Gold accent line at bottom */}
        <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-primary to-transparent opacity-60" />
      </div>

      {/* Image indicators */}
      <div className="absolute bottom-20 sm:bottom-24 right-4 sm:right-8 z-20 flex gap-2">
        {heroImages.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentImageIndex(index)}
            className={`h-1 rounded-full transition-all duration-500 ${
              index === currentImageIndex 
                ? "bg-primary w-8" 
                : "bg-white/40 w-3 hover:bg-white/60"
            }`}
            aria-label={`Go to image ${index + 1}`}
          />
        ))}
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col justify-end min-h-[480px] sm:min-h-[520px] md:min-h-[560px] px-5 sm:px-8 lg:px-12 pt-24 pb-10 sm:pb-12">
        {/* Trust badge */}
        <motion.div 
          className="absolute top-24 sm:top-28 right-4 sm:right-8 lg:right-12"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.6 }}
        >
          <div className="flex items-center gap-2 bg-primary/20 backdrop-blur-md border border-primary/30 rounded-full px-3 py-1.5">
            <Award className="w-4 h-4 text-primary" />
            <span className="text-xs sm:text-sm font-medium text-white tracking-wide">
              Trusted by <span className="font-bold text-primary">FUTA</span>
            </span>
          </div>
        </motion.div>

        {/* Main content */}
        <div className="space-y-4 sm:space-y-5">
          <motion.p
            className="text-primary font-medium text-sm sm:text-base tracking-[0.2em] uppercase"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
          >
            AI-Powered Excellence
          </motion.p>
          
          <motion.h1 
            className="font-display text-[2.25rem] leading-[1.05] sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
          >
            FUTA CBTs<br />
            <span className="text-gradient-primary">Made Easy</span>
          </motion.h1>

          <motion.p
            className="text-white/75 text-sm sm:text-base max-w-sm leading-relaxed font-light"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.5 }}
          >
            Practice with AI-powered quizzes, get instant explanations, and ace your exams with confidence.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.5 }}
            className="flex items-center gap-3 pt-2"
          >
            <Button 
              size="lg"
              className="h-12 sm:h-13 px-7 sm:px-9 text-sm sm:text-base font-semibold bg-primary hover:bg-primary/90 text-primary-foreground rounded-full shadow-xl shadow-primary/30 active:scale-95 transition-all"
              onClick={() => navigate("/auth")}
            >
              Start Learning Now
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
            <Button 
              variant="ghost"
              size="lg"
              className="h-12 sm:h-13 px-6 text-white/80 hover:text-white hover:bg-white/10 rounded-full border border-white/20"
              onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
            >
              Learn More
            </Button>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
