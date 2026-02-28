import { UserPlus, BookCheck, TrendingUp, Trophy } from "lucide-react";

const steps = [
  { number: "01", icon: UserPlus, title: "Create Account", description: "Sign up in seconds with your email. Choose your department and courses to personalize your experience." },
  { number: "02", icon: BookCheck, title: "Practice Questions", description: "Access thousands of past questions. Use practice mode to learn or CBT mode to simulate real exams." },
  { number: "03", icon: TrendingUp, title: "Track Progress", description: "Get detailed analytics on your performance. Identify weak areas and watch your scores improve." },
  { number: "04", icon: Trophy, title: "Ace Your Exams", description: "Walk into your CBT exams with confidence. You've practiced enough to succeed!" },
];

const HowItWorksSection = () => {
  return (
    <section id="how-it-works" className="py-20 lg:py-28 relative overflow-hidden scroll-mt-20">
      <div className="absolute inset-0 bg-gradient-to-b from-background via-muted/30 to-background" />
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-14">
          <p className="text-primary font-medium text-sm tracking-[0.15em] uppercase mb-4">Simple Process</p>
          <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-6">
            How It <span className="text-gradient-primary">Works</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            Getting started is easy. Follow these simple steps to begin your journey to exam success.
          </p>
        </div>

        <div className="relative max-w-5xl mx-auto">
          {/* Connection line */}
          <div className="hidden lg:block absolute top-28 left-[10%] right-[10%] h-px">
            <div className="w-full h-full bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
            {steps.map((step, index) => {
              const Icon = step.icon;
              return (
                <div key={index} className="relative group">
                  <div className="glass-card glass-card-hover rounded-2xl p-6 text-center h-full">
                    {/* Number + Icon */}
                    <div className="relative mx-auto w-16 h-16 mb-5">
                      <div className="w-full h-full bg-primary/10 rounded-full flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                        <Icon className="w-7 h-7 text-primary" />
                      </div>
                      <span className="absolute -top-1 -right-1 w-7 h-7 bg-primary rounded-full flex items-center justify-center text-xs font-bold text-primary-foreground shadow-md ring-2 ring-background">
                        {index + 1}
                      </span>
                    </div>
                    
                    <h3 className="font-display text-lg font-bold text-foreground mb-2 group-hover:text-primary transition-colors">
                      {step.title}
                    </h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">{step.description}</p>
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
