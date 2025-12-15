import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Play, Sparkles, Brain, Target, TrendingUp } from "lucide-react";

const HeroSection = () => {
  const navigate = useNavigate();

  return (
    <section className="relative min-h-screen bg-gradient-hero overflow-hidden pt-16">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-accent/5 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/3 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-4 py-20 lg:py-32 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left Content */}
          <div className="max-w-2xl animate-slide-up">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-4 py-2 mb-6">
              <Sparkles className="w-4 h-4 text-accent" />
              <span className="text-sm font-medium text-foreground">AI-Powered Learning Platform</span>
            </div>

            <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold text-foreground leading-tight mb-6">
              Ace Your{" "}
              <span className="text-gradient-primary">CBT Exams</span>{" "}
              with AI-Powered Prep
            </h1>

            <p className="text-lg md:text-xl text-muted-foreground mb-8 leading-relaxed">
              Practice past questions, get instant AI explanations, and build exam confidence. 
              Join thousands of FUTA students achieving academic excellence.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 mb-10">
              <Button variant="hero" size="xl" className="group" onClick={() => navigate("/auth")}>
                Start Practicing Free
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button variant="hero-outline" size="xl" className="group">
                <Play className="w-5 h-5" />
                Watch Demo
              </Button>
            </div>

            {/* Stats */}
            <div className="flex flex-wrap gap-8">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-success/10 rounded-xl flex items-center justify-center">
                  <Target className="w-6 h-6 text-success" />
                </div>
                <div>
                  <p className="font-display font-bold text-2xl text-foreground">10,000+</p>
                  <p className="text-sm text-muted-foreground">Questions</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                  <Brain className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="font-display font-bold text-2xl text-foreground">5,000+</p>
                  <p className="text-sm text-muted-foreground">Students</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-accent/10 rounded-xl flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-accent" />
                </div>
                <div>
                  <p className="font-display font-bold text-2xl text-foreground">95%</p>
                  <p className="text-sm text-muted-foreground">Success Rate</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Content - Floating Cards */}
          <div className="relative lg:h-[600px] hidden lg:block">
            {/* Main Quiz Card */}
            <div className="absolute top-10 right-0 w-80 bg-card rounded-2xl shadow-xl border border-border p-6 animate-float">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                  <Brain className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-display font-semibold text-foreground">PHY 101</p>
                  <p className="text-sm text-muted-foreground">General Physics</p>
                </div>
              </div>
              <div className="space-y-3 mb-4">
                <div className="h-3 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-primary w-3/4 rounded-full" />
                </div>
                <p className="text-sm text-muted-foreground">Question 15 of 20</p>
              </div>
              <div className="bg-muted/50 rounded-xl p-4">
                <p className="text-sm text-foreground font-medium mb-3">
                  A body of mass 5kg is moving with a velocity of 10m/s...
                </p>
                <div className="space-y-2">
                  {["A. 250 J", "B. 500 J", "C. 125 J", "D. 50 J"].map((option, i) => (
                    <div
                      key={i}
                      className={`p-2 rounded-lg border text-sm ${
                        i === 0
                          ? "border-success bg-success/10 text-success"
                          : "border-border text-muted-foreground"
                      }`}
                    >
                      {option}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* AI Explanation Card */}
            <div className="absolute bottom-20 left-0 w-72 bg-card rounded-2xl shadow-xl border border-border p-5 animate-float-delayed">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-5 h-5 text-accent" />
                <span className="font-display font-semibold text-foreground">AI Explanation</span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                The kinetic energy formula is KE = ½mv². Substituting m=5kg and v=10m/s:
                KE = ½ × 5 × 100 = <span className="text-success font-medium">250 J</span>
              </p>
            </div>

            {/* Progress Card */}
            <div className="absolute top-1/2 left-10 w-48 bg-card rounded-xl shadow-lg border border-border p-4 animate-pulse-subtle">
              <p className="text-xs text-muted-foreground mb-2">Today's Progress</p>
              <div className="flex items-end gap-1 h-16">
                {[40, 65, 45, 80, 60, 90, 75].map((height, i) => (
                  <div
                    key={i}
                    className="flex-1 bg-gradient-primary rounded-t-sm"
                    style={{ height: `${height}%` }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;