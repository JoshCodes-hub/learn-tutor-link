import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Play, Sparkles, Brain, Target, TrendingUp, CheckCircle2, Star, Zap, Users } from "lucide-react";
import { motion } from "framer-motion";
import studentsHero from "@/assets/students-hero.jpg";

const HeroSection = () => {
  const navigate = useNavigate();

  return (
    <section className="relative min-h-screen overflow-hidden pt-16" aria-label="Hero section">
      {/* Premium gradient background */}
      <div className="absolute inset-0 bg-gradient-hero" />
      
      {/* Animated mesh gradient overlay */}
      <div className="absolute inset-0 bg-gradient-mesh opacity-60" />
      
      {/* Hero image overlay with gradient */}
      <div className="absolute inset-0 overflow-hidden">
        <div 
          className="absolute inset-0 opacity-[0.08] dark:opacity-[0.12]"
          style={{
            backgroundImage: `url(${studentsHero})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/60 to-background" />
      </div>
      
      {/* Animated background blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div 
          className="absolute -top-40 -left-40 w-80 h-80 md:w-[500px] md:h-[500px] bg-primary/10 rounded-full blur-3xl"
          animate={{ 
            x: [0, 30, 0],
            y: [0, -20, 0],
            scale: [1, 1.1, 1]
          }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div 
          className="absolute top-1/3 -right-40 w-96 h-96 md:w-[600px] md:h-[600px] bg-accent/8 rounded-full blur-3xl"
          animate={{ 
            x: [0, -30, 0],
            y: [0, 20, 0],
            scale: [1.1, 1, 1.1]
          }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div 
          className="absolute -bottom-40 left-1/3 w-80 h-80 md:w-[500px] md:h-[500px] bg-primary/5 rounded-full blur-3xl"
          animate={{ 
            x: [0, 20, 0],
            y: [0, -15, 0]
          }}
          transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
        />
        
        {/* Subtle grid pattern */}
        <div 
          className="absolute inset-0 opacity-[0.015]"
          style={{
            backgroundImage: `linear-gradient(hsl(var(--foreground)) 1px, transparent 1px),
                              linear-gradient(to right, hsl(var(--foreground)) 1px, transparent 1px)`,
            backgroundSize: '60px 60px'
          }}
        />
      </div>

      <div className="container mx-auto px-4 py-16 md:py-24 lg:py-32 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Left Content */}
          <motion.div 
            className="max-w-2xl"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          >
            {/* Trust badge */}
            <motion.div 
              className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-4 py-2 mb-6 backdrop-blur-sm"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
            >
              <div className="flex -space-x-1">
                <div className="w-5 h-5 rounded-full bg-gradient-primary flex items-center justify-center">
                  <Star className="w-3 h-3 text-primary-foreground fill-primary-foreground" />
                </div>
              </div>
              <span className="text-sm font-semibold text-foreground">Trusted by 5,000+ FUTA Students</span>
              <Sparkles className="w-4 h-4 text-accent" />
            </motion.div>

            <motion.h1 
              className="font-display text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold text-foreground leading-[1.1] mb-6 text-balance"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.6 }}
            >
              Master Your{" "}
              <span className="relative">
                <span className="text-gradient-primary">CBT Exams</span>
                <motion.svg 
                  className="absolute -bottom-2 left-0 w-full" 
                  viewBox="0 0 200 12" 
                  fill="none"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ delay: 0.8, duration: 0.8 }}
                >
                  <motion.path 
                    d="M2 8C50 4 150 4 198 8" 
                    stroke="hsl(var(--accent))" 
                    strokeWidth="3" 
                    strokeLinecap="round"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ delay: 0.8, duration: 0.8 }}
                  />
                </motion.svg>
              </span>{" "}
              with AI Power
            </motion.h1>

            <motion.p 
              className="text-lg md:text-xl text-muted-foreground mb-8 leading-relaxed max-w-xl"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              Practice with thousands of past questions, get instant AI explanations, 
              and track your progress. Join the smartest way to prepare for FUTA exams.
            </motion.p>

            {/* Feature chips */}
            <motion.div 
              className="flex flex-wrap gap-3 mb-8"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
            >
              {[
                { icon: CheckCircle2, text: "10,000+ Questions" },
                { icon: Zap, text: "AI Explanations" },
                { icon: Target, text: "CBT Simulation" },
              ].map((feature, i) => (
                <motion.div 
                  key={i} 
                  className="inline-flex items-center gap-2 bg-card/60 backdrop-blur-sm border border-border/50 rounded-full px-3 py-1.5"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.7 + i * 0.1 }}
                  whileHover={{ scale: 1.05 }}
                >
                  <feature.icon className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium text-foreground">{feature.text}</span>
                </motion.div>
              ))}
            </motion.div>

            {/* CTA Buttons */}
            <motion.div 
              className="flex flex-col sm:flex-row gap-4 mb-10"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
            >
              <Button 
                variant="hero" 
                size="xl" 
                className="group shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30"
                onClick={() => navigate("/auth")}
              >
                Start Learning Free
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button variant="hero-outline" size="xl" className="group backdrop-blur-sm">
                <Play className="w-5 h-5 group-hover:scale-110 transition-transform" />
                Watch Demo
              </Button>
            </motion.div>

            {/* Social proof */}
            <motion.div 
              className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-8"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
            >
              <div className="flex items-center -space-x-3">
                {["A", "O", "C", "T", "F"].map((initial, i) => (
                  <motion.div
                    key={i}
                    className="w-10 h-10 rounded-full border-2 border-background flex items-center justify-center text-xs font-bold shadow-md"
                    style={{
                      background: `linear-gradient(135deg, hsl(${173 + i * 30} 58% ${39 + i * 5}%) 0%, hsl(${173 + i * 30} 58% ${30 + i * 5}%) 100%)`,
                      color: 'white'
                    }}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 1.1 + i * 0.1 }}
                  >
                    {initial}
                  </motion.div>
                ))}
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1 mb-0.5">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-accent text-accent" />
                  ))}
                  <span className="text-sm font-semibold text-foreground ml-1">4.9/5</span>
                </div>
                <p className="text-sm text-muted-foreground">Based on 1,000+ student reviews</p>
              </div>
            </motion.div>
          </motion.div>

          {/* Right Content - Premium Floating Cards with Student Image */}
          <div className="relative h-[500px] lg:h-[650px] hidden md:block perspective-1000">
            {/* Student image showcase */}
            <motion.div 
              className="absolute top-0 right-0 lg:right-0 w-[340px] lg:w-[400px] h-[280px] lg:h-[320px] rounded-3xl overflow-hidden shadow-2xl border border-border/50"
              initial={{ opacity: 0, y: 40, rotateY: -10 }}
              animate={{ opacity: 1, y: 0, rotateY: -5 }}
              transition={{ delay: 0.4, duration: 0.8 }}
              style={{ transform: 'rotateY(-5deg) rotateX(5deg)' }}
            >
              <img 
                src={studentsHero} 
                alt="Happy university students studying" 
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent" />
              <div className="absolute bottom-4 left-4 right-4">
                <div className="glass-card rounded-xl p-3 flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-primary rounded-lg flex items-center justify-center">
                    <Users className="w-5 h-5 text-primary-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-foreground">5,000+ Students</p>
                    <p className="text-xs text-muted-foreground">Preparing smarter together</p>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* AI Explanation Card */}
            <motion.div 
              className="absolute bottom-16 lg:bottom-24 left-0 w-[280px] lg:w-[300px] glass-card rounded-2xl p-5 preserve-3d"
              initial={{ opacity: 0, x: -40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6, duration: 0.8 }}
              style={{ transform: 'rotateY(5deg) rotateX(-5deg)' }}
            >
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 bg-gradient-accent rounded-lg flex items-center justify-center shadow-md">
                  <Sparkles className="w-4 h-4 text-accent-foreground" />
                </div>
                <span className="font-display font-bold text-foreground">AI Explanation</span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Using the kinetic energy formula:<br />
                <span className="font-mono text-primary font-medium">KE = ½mv²</span><br />
                KE = ½ × 5 × (10)² = <span className="text-success font-bold">250 J</span>
              </p>
              <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                <CheckCircle2 className="w-3.5 h-3.5 text-success" />
                <span>Verified by Expert Tutors</span>
              </div>
            </motion.div>

            {/* Progress Card */}
            <motion.div 
              className="absolute top-1/2 -translate-y-1/2 left-4 lg:left-0 w-56 glass-card rounded-xl p-4 preserve-3d"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8, duration: 0.8 }}
              style={{ transform: 'rotateY(8deg)' }}
            >
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="w-4 h-4 text-primary" />
                <p className="text-xs font-semibold text-foreground">Weekly Progress</p>
              </div>
              <div className="flex items-end gap-1 h-20">
                {[40, 55, 45, 70, 60, 85, 90].map((height, i) => (
                  <motion.div
                    key={i}
                    className="flex-1 bg-gradient-primary rounded-t transition-all duration-500 hover:opacity-80"
                    initial={{ height: 0 }}
                    animate={{ height: `${height}%` }}
                    transition={{ delay: 1 + i * 0.1, duration: 0.5 }}
                  />
                ))}
              </div>
              <div className="flex justify-between mt-2 text-[10px] text-muted-foreground">
                <span>Mon</span>
                <span>Sun</span>
              </div>
            </motion.div>

            {/* Floating badges */}
            <motion.div 
              className="absolute top-56 lg:top-72 left-20 glass-card rounded-full px-3 py-1.5 flex items-center gap-2"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 1.2 }}
            >
              <motion.div 
                className="w-2 h-2 rounded-full bg-success"
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              />
              <span className="text-xs font-semibold text-foreground">2,847 online</span>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <motion.div 
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.6 }}
        transition={{ delay: 1.5 }}
      >
        <span className="text-xs text-muted-foreground">Scroll to explore</span>
        <div className="w-6 h-10 border-2 border-muted-foreground/30 rounded-full flex items-start justify-center p-1.5">
          <motion.div 
            className="w-1.5 h-3 bg-muted-foreground/50 rounded-full"
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>
      </motion.div>
    </section>
  );
};

export default HeroSection;
