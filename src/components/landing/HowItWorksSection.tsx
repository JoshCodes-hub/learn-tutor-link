import { UserPlus, BookCheck, TrendingUp, Trophy, ArrowRight } from "lucide-react";

const steps = [
  {
    number: "01",
    icon: UserPlus,
    title: "Create Account",
    description: "Sign up in seconds with your email. Choose your department and courses to personalize your experience.",
    gradient: "from-blue-500 to-cyan-500",
  },
  {
    number: "02",
    icon: BookCheck,
    title: "Practice Questions",
    description: "Access thousands of past questions. Use practice mode to learn or CBT mode to simulate real exams.",
    gradient: "from-primary to-teal-500",
  },
  {
    number: "03",
    icon: TrendingUp,
    title: "Track Progress",
    description: "Get detailed analytics on your performance. Identify weak areas and watch your scores improve.",
    gradient: "from-purple-500 to-pink-500",
  },
  {
    number: "04",
    icon: Trophy,
    title: "Ace Your Exams",
    description: "Walk into your CBT exams with confidence. You've practiced enough to succeed!",
    gradient: "from-accent to-orange-500",
  },
];

const HowItWorksSection = () => {
  return (
    <section id="how-it-works" className="py-20 lg:py-32 relative overflow-hidden scroll-mt-20">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-muted/30 to-background" />
      
      <div className="container mx-auto px-4 relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 bg-accent/10 border border-accent/20 rounded-full px-4 py-2 mb-6">
            <span className="text-sm font-semibold text-foreground">Simple Process</span>
          </div>
          <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-6">
            How It <span className="text-gradient-accent">Works</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            Getting started is easy. Follow these simple steps to begin your journey to exam success.
          </p>
        </div>

        {/* Steps */}
        <div className="relative max-w-6xl mx-auto">
          {/* Connection Line - Desktop */}
          <div className="hidden lg:block absolute top-32 left-[10%] right-[10%] h-0.5">
            <div className="w-full h-full bg-gradient-to-r from-transparent via-border to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-accent/20 to-success/20 blur-sm" />
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
            {steps.map((step, index) => {
              const Icon = step.icon;
              return (
                <div key={index} className="relative group">
                  {/* Arrow connector - Mobile/Tablet */}
                  {index < steps.length - 1 && (
                    <div className="hidden md:block lg:hidden absolute -bottom-3 left-1/2 -translate-x-1/2 z-10">
                      <ArrowRight className="w-6 h-6 text-muted-foreground rotate-90" />
                    </div>
                  )}
                  
                  {/* Step Card */}
                  <div className="glass-card glass-card-hover rounded-2xl p-6 text-center h-full">
                    {/* Number Badge */}
                    <div className="relative mx-auto w-20 h-20 mb-6">
                      {/* Glow effect */}
                      <div className={`absolute inset-0 bg-gradient-to-br ${step.gradient} rounded-full blur-xl opacity-20 group-hover:opacity-40 transition-opacity`} />
                      
                      {/* Outer ring */}
                      <div className="absolute inset-0 rounded-full border-2 border-dashed border-muted-foreground/20 animate-spin" style={{ animationDuration: '20s' }} />
                      
                      {/* Main circle */}
                      <div className="relative w-full h-full bg-card rounded-full border-2 border-border flex items-center justify-center shadow-lg group-hover:border-primary/50 transition-colors">
                        <div className={`w-14 h-14 rounded-full bg-gradient-to-br ${step.gradient} flex items-center justify-center shadow-lg`}>
                          <Icon className="w-7 h-7 text-white" />
                        </div>
                      </div>
                      
                      {/* Step number */}
                      <span className="absolute -top-1 -right-1 w-8 h-8 bg-gradient-accent rounded-full flex items-center justify-center text-sm font-bold text-accent-foreground shadow-lg ring-4 ring-background">
                        {step.number.slice(-1)}
                      </span>
                    </div>
                    
                    <h3 className="font-display text-lg font-bold text-foreground mb-3 group-hover:text-primary transition-colors">
                      {step.title}
                    </h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">
                      {step.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};

export default HowItWorksSection;
