import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import heroStudent from "@/assets/hero-student.jpg";
import logo from "@/assets/logo.png";

const HeroSection = () => {
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState("");

  useEffect(() => {
    const updateDate = () => {
      const now = new Date();
      const options: Intl.DateTimeFormatOptions = {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      };
      setCurrentDate(now.toLocaleDateString('en-US', options));
    };
    updateDate();
    const interval = setInterval(updateDate, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="relative min-h-screen overflow-hidden" aria-label="Hero section">
      {/* Full-screen background image */}
      <div className="absolute inset-0">
        <img 
          src={heroStudent} 
          alt="Student studying with OverraPrep AI" 
          className="w-full h-full object-cover object-center"
        />
        {/* Dark overlay for text readability */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/20 to-black/60" />
      </div>

      {/* Content overlay */}
      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Top bar with logo and trust badge */}
        <div className="flex items-center justify-between px-4 sm:px-6 lg:px-8 pt-20 sm:pt-24">
          {/* Logo */}
          <motion.div 
            className="flex items-center gap-2"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <img src={logo} alt="OverraPrep AI" className="w-8 h-8 sm:w-10 sm:h-10" />
            <span className="font-display text-xl sm:text-2xl font-bold text-white">
              OverraPrep <span className="text-primary">AI</span>
            </span>
          </motion.div>

          {/* Trust badge */}
          <motion.div 
            className="flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-full px-3 py-1.5 sm:px-4 sm:py-2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
          >
            <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-primary flex items-center justify-center">
              <CheckCircle2 className="w-3 h-3 sm:w-4 sm:h-4 text-primary-foreground" />
            </div>
            <span className="text-xs sm:text-sm font-medium text-white">
              Trusted by<br className="sm:hidden" />
              <span className="font-bold"> FUTA Students</span>
            </span>
          </motion.div>
        </div>

        {/* Main content */}
        <div className="flex-1 flex flex-col justify-center px-4 sm:px-6 lg:px-8 py-8">
          {/* Date display */}
          <motion.p 
            className="text-white/80 text-sm sm:text-base mb-4"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            {currentDate}
          </motion.p>

          {/* Main headline */}
          <motion.h1 
            className="font-display text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold text-white leading-[1.05] mb-6"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.6 }}
          >
            FUTA CBTs<br />
            Made Easy
          </motion.h1>

          {/* Floating phone mockup with AI explanation */}
          <motion.div 
            className="relative self-end mr-4 sm:mr-8 lg:mr-16 -mt-8 sm:-mt-16"
            initial={{ opacity: 0, y: 40, rotate: 5 }}
            animate={{ opacity: 1, y: 0, rotate: 0 }}
            transition={{ delay: 0.7, duration: 0.8 }}
          >
            {/* Phone frame */}
            <div className="w-40 sm:w-52 lg:w-64 bg-gray-900 rounded-3xl p-1.5 shadow-2xl border border-gray-700">
              {/* Phone screen */}
              <div className="bg-background rounded-2xl overflow-hidden">
                {/* Phone status bar */}
                <div className="bg-primary/10 px-3 py-2 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <img src={logo} alt="" className="w-4 h-4" />
                    <span className="text-[10px] sm:text-xs font-semibold text-foreground">OverraPrep AI</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground" />
                    <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground" />
                  </div>
                </div>
                
                {/* Chat bubbles */}
                <div className="p-3 space-y-2">
                  <div className="bg-muted rounded-xl rounded-tl-sm p-2">
                    <div className="h-2 bg-muted-foreground/20 rounded w-3/4 mb-1" />
                    <div className="h-2 bg-muted-foreground/20 rounded w-1/2" />
                  </div>
                  
                  {/* AI Explanation card */}
                  <motion.div 
                    className="bg-primary/10 border border-primary/20 rounded-xl p-3"
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 1.2 }}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-5 h-5 sm:w-6 sm:h-6 bg-primary/20 rounded-lg flex items-center justify-center">
                        <Sparkles className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-primary" />
                      </div>
                      <span className="text-xs sm:text-sm font-bold text-foreground">AI Explanation</span>
                    </div>
                    <p className="text-[9px] sm:text-[10px] text-muted-foreground leading-relaxed">
                      From your university student AI is study, proper easy and especially interactive in ethical students.
                    </p>
                  </motion.div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Bottom CTA */}
        <motion.div 
          className="px-4 sm:px-6 lg:px-8 pb-8 sm:pb-12"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9 }}
        >
          <Button 
            size="xl"
            className="w-full sm:w-auto sm:min-w-[300px] h-14 sm:h-16 text-lg sm:text-xl font-bold bg-primary hover:bg-primary/90 text-primary-foreground rounded-2xl shadow-xl shadow-primary/30"
            onClick={() => navigate("/auth")}
          >
            Start Learning Now
          </Button>
          
          {/* Decorative sparkle */}
          <motion.div 
            className="absolute bottom-6 right-6 text-primary/60"
            animate={{ 
              scale: [1, 1.2, 1],
              rotate: [0, 15, 0]
            }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <Sparkles className="w-6 h-6" />
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};

export default HeroSection;
