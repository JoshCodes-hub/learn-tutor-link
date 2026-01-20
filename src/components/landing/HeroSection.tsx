import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Play, Sparkles, Brain, Target, TrendingUp, CheckCircle2, Star, Zap, Users } from "lucide-react";

const HeroSection = () => {
  const navigate = useNavigate();

  return (
    <section className="relative min-h-screen overflow-hidden pt-16" aria-label="Hero section">
      {/* Premium gradient background */}
      <div className="absolute inset-0 bg-gradient-hero" />
      
      {/* Animated mesh gradient overlay */}
      <div className="absolute inset-0 bg-gradient-mesh opacity-60" />
      
      {/* Animated background blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-80 h-80 md:w-[500px] md:h-[500px] bg-primary/10 rounded-full blur-3xl animate-blob" />
        <div className="absolute top-1/3 -right-40 w-96 h-96 md:w-[600px] md:h-[600px] bg-accent/8 rounded-full blur-3xl animate-blob-delayed" />
        <div className="absolute -bottom-40 left-1/3 w-80 h-80 md:w-[500px] md:h-[500px] bg-primary/5 rounded-full blur-3xl animate-blob" />
        
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
          <div className="max-w-2xl animate-slide-up">
            {/* Trust badge */}
            <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-4 py-2 mb-6 backdrop-blur-sm">
              <div className="flex -space-x-1">
                <div className="w-5 h-5 rounded-full bg-gradient-primary flex items-center justify-center">
                  <Star className="w-3 h-3 text-primary-foreground fill-primary-foreground" />
                </div>
              </div>
              <span className="text-sm font-semibold text-foreground">Trusted by 5,000+ FUTA Students</span>
              <Sparkles className="w-4 h-4 text-accent" />
            </div>

            <h1 className="font-display text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold text-foreground leading-[1.1] mb-6 text-balance">
              Master Your{" "}
              <span className="relative">
                <span className="text-gradient-primary">CBT Exams</span>
                <svg className="absolute -bottom-2 left-0 w-full" viewBox="0 0 200 12" fill="none">
                  <path d="M2 8C50 4 150 4 198 8" stroke="hsl(var(--accent))" strokeWidth="3" strokeLinecap="round" className="animate-pulse-subtle" />
                </svg>
              </span>{" "}
              with AI Power
            </h1>

            <p className="text-lg md:text-xl text-muted-foreground mb-8 leading-relaxed max-w-xl">
              Practice with thousands of past questions, get instant AI explanations, 
              and track your progress. Join the smartest way to prepare for FUTA exams.
            </p>

            {/* Feature chips */}
            <div className="flex flex-wrap gap-3 mb-8">
              {[
                { icon: CheckCircle2, text: "10,000+ Questions" },
                { icon: Zap, text: "AI Explanations" },
                { icon: Target, text: "CBT Simulation" },
              ].map((feature, i) => (
                <div key={i} className="inline-flex items-center gap-2 bg-card/60 backdrop-blur-sm border border-border/50 rounded-full px-3 py-1.5">
                  <feature.icon className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium text-foreground">{feature.text}</span>
                </div>
              ))}
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 mb-10">
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
            </div>

            {/* Social proof */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-8">
              <div className="flex items-center -space-x-3">
                {["A", "O", "C", "T", "F"].map((initial, i) => (
                  <div
                    key={i}
                    className="w-10 h-10 rounded-full border-2 border-background flex items-center justify-center text-xs font-bold shadow-md"
                    style={{
                      background: `linear-gradient(135deg, hsl(${173 + i * 30} 58% ${39 + i * 5}%) 0%, hsl(${173 + i * 30} 58% ${30 + i * 5}%) 100%)`,
                      color: 'white'
                    }}
                  >
                    {initial}
                  </div>
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
            </div>
          </div>

          {/* Right Content - Premium Floating Cards */}
          <div className="relative h-[500px] lg:h-[650px] hidden md:block perspective-1000">
            {/* Main Quiz Card */}
            <div className="absolute top-0 right-0 lg:right-8 w-[320px] lg:w-[360px] glass-card rounded-2xl p-6 animate-float preserve-3d" style={{ transform: 'rotateY(-5deg) rotateX(5deg)' }}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
                    <Brain className="w-6 h-6 text-primary-foreground" />
                  </div>
                  <div>
                    <p className="font-display font-bold text-foreground">PHY 101</p>
                    <p className="text-sm text-muted-foreground">General Physics I</p>
                  </div>
                </div>
                <div className="px-2.5 py-1 bg-success/10 text-success text-xs font-semibold rounded-full">
                  Live
                </div>
              </div>
              
              <div className="mb-4">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-muted-foreground">Question 15 of 20</span>
                  <span className="text-primary font-semibold">75%</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-primary w-3/4 rounded-full transition-all duration-500" />
                </div>
              </div>
              
              <div className="bg-muted/50 rounded-xl p-4 border border-border/50">
                <p className="text-sm text-foreground font-medium mb-4 leading-relaxed">
                  A body of mass 5kg is moving with a velocity of 10m/s. Calculate its kinetic energy.
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: "A. 250 J", correct: true },
                    { label: "B. 500 J", correct: false },
                    { label: "C. 125 J", correct: false },
                    { label: "D. 50 J", correct: false },
                  ].map((option, i) => (
                    <div
                      key={i}
                      className={`p-2.5 rounded-lg border text-sm font-medium transition-all ${
                        option.correct
                          ? "border-success bg-success/10 text-success"
                          : "border-border/50 text-muted-foreground hover:border-primary/30 hover:bg-primary/5"
                      }`}
                    >
                      {option.label}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* AI Explanation Card */}
            <div className="absolute bottom-16 lg:bottom-24 left-0 w-[280px] lg:w-[300px] glass-card rounded-2xl p-5 animate-float-delayed preserve-3d" style={{ transform: 'rotateY(5deg) rotateX(-5deg)' }}>
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
            </div>

            {/* Progress Card */}
            <div className="absolute top-1/2 -translate-y-1/2 left-4 lg:left-0 w-56 glass-card rounded-xl p-4 animate-float-slow preserve-3d" style={{ transform: 'rotateY(8deg)', animationDelay: '1s' }}>
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="w-4 h-4 text-primary" />
                <p className="text-xs font-semibold text-foreground">Weekly Progress</p>
              </div>
              <div className="flex items-end gap-1 h-20">
                {[40, 55, 45, 70, 60, 85, 90].map((height, i) => (
                  <div
                    key={i}
                    className="flex-1 bg-gradient-primary rounded-t transition-all duration-500 hover:opacity-80"
                    style={{ height: `${height}%` }}
                  />
                ))}
              </div>
              <div className="flex justify-between mt-2 text-[10px] text-muted-foreground">
                <span>Mon</span>
                <span>Sun</span>
              </div>
            </div>

            {/* Floating badges */}
            <div className="absolute top-20 left-20 glass-card rounded-full px-3 py-1.5 flex items-center gap-2 animate-pulse-subtle">
              <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
              <span className="text-xs font-semibold text-foreground">2,847 online</span>
            </div>
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 opacity-60 animate-pulse-subtle">
        <span className="text-xs text-muted-foreground">Scroll to explore</span>
        <div className="w-6 h-10 border-2 border-muted-foreground/30 rounded-full flex items-start justify-center p-1.5">
          <div className="w-1.5 h-3 bg-muted-foreground/50 rounded-full animate-bounce" />
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
