import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import heroStudent from "@/assets/hero-student.jpg";
import studentsHero from "@/assets/students-hero.jpg";
import studentFemale from "@/assets/student-female.jpg";
import studentMale from "@/assets/student-male.jpg";
import studentsGroup from "@/assets/students-group.jpg";

const heroImages = [
  heroStudent,
  studentsHero,
  studentFemale,
  studentMale,
  studentsGroup,
];

const HeroSection = () => {
  const navigate = useNavigate();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % heroImages.length);
    }, 4000); // Change image every 4 seconds

    return () => clearInterval(interval);
  }, []);

  return (
    <section className="relative w-full overflow-hidden" aria-label="Hero section">
      {/* Animated background images */}
      <div className="absolute inset-0">
      <AnimatePresence mode="popLayout">
          <motion.img
            key={currentImageIndex}
            src={heroImages[currentImageIndex]}
            alt="Students studying with OverraPrep AI"
            className="absolute inset-0 w-full h-full object-cover object-[center_20%]"
            initial={{ opacity: 0, scale: 1.15 }}
            animate={{ 
              opacity: 1, 
              scale: 1.05,
              transition: {
                opacity: { duration: 1, ease: "easeInOut" },
                scale: { duration: 4, ease: "easeOut" }
              }
            }}
            exit={{ opacity: 0, transition: { duration: 0.8 } }}
          />
        </AnimatePresence>
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-black/20" />
      </div>

      {/* Image indicators */}
      <div className="absolute bottom-20 sm:bottom-24 right-4 sm:right-8 z-20 flex gap-1.5">
        {heroImages.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentImageIndex(index)}
            className={`w-2 h-2 rounded-full transition-all duration-300 ${
              index === currentImageIndex 
                ? "bg-primary w-6" 
                : "bg-white/50 hover:bg-white/70"
            }`}
            aria-label={`Go to image ${index + 1}`}
          />
        ))}
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col justify-end min-h-[420px] sm:min-h-[480px] md:min-h-[520px] px-5 sm:px-8 lg:px-12 pt-20 pb-8 sm:pb-10">
        {/* Trust badge */}
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

        {/* Main content */}
        <div className="space-y-3 sm:space-y-4">
          <motion.h1 
            className="font-display text-[2rem] leading-[1.1] sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.4 }}
          >
            FUTA CBTs<br />
            <span className="text-primary">Made Easy</span>
          </motion.h1>

          <motion.p
            className="text-white/85 text-sm sm:text-base max-w-xs sm:max-w-sm leading-relaxed"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.4 }}
          >
            Practice with AI-powered quizzes and ace your exams.
          </motion.p>

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
