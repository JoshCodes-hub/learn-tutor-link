import { UserPlus, BookCheck, TrendingUp, Trophy } from "lucide-react";

const steps = [
  {
    number: "01",
    icon: UserPlus,
    title: "Create Your Account",
    description: "Sign up in seconds with your email. Choose your department and courses to personalize your experience.",
  },
  {
    number: "02",
    icon: BookCheck,
    title: "Practice Questions",
    description: "Access thousands of past questions. Use practice mode to learn or CBT mode to simulate real exams.",
  },
  {
    number: "03",
    icon: TrendingUp,
    title: "Track Progress",
    description: "Get detailed analytics on your performance. Identify weak areas and watch your scores improve.",
  },
  {
    number: "04",
    icon: Trophy,
    title: "Ace Your Exams",
    description: "Walk into your CBT exams with confidence. You've practiced enough to succeed!",
  },
];

const HowItWorksSection = () => {
  return (
    <section id="how-it-works" className="py-20 lg:py-32 bg-muted/30 scroll-mt-20">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-6">
            How It <span className="text-gradient-accent">Works</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            Getting started is easy. Follow these simple steps to begin your journey to exam success.
          </p>
        </div>

        {/* Steps */}
        <div className="relative max-w-5xl mx-auto">
          {/* Connection Line */}
          <div className="hidden lg:block absolute top-24 left-0 right-0 h-0.5 bg-border" />
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map((step, index) => {
              const Icon = step.icon;
              return (
                <div key={index} className="relative">
                  {/* Step Card */}
                  <div className="bg-card rounded-2xl border border-border p-6 text-center hover:shadow-lg transition-shadow duration-300">
                    {/* Number Badge */}
                    <div className="relative mx-auto w-16 h-16 mb-6">
                      <div className="absolute inset-0 bg-gradient-primary rounded-full opacity-20" />
                      <div className="relative w-full h-full bg-card rounded-full border-2 border-primary flex items-center justify-center">
                        <Icon className="w-7 h-7 text-primary" />
                      </div>
                      <span className="absolute -top-2 -right-2 w-8 h-8 bg-gradient-accent rounded-full flex items-center justify-center text-sm font-bold text-accent-foreground shadow-lg">
                        {step.number.slice(-1)}
                      </span>
                    </div>
                    
                    <h3 className="font-display text-lg font-bold text-foreground mb-3">
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
