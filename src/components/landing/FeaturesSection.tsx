import { 
  Brain, 
  Clock, 
  BarChart3, 
  Sparkles, 
  BookOpen, 
  Shield,
  Zap,
  Target
} from "lucide-react";

const features = [
  {
    icon: Brain,
    title: "AI-Powered Explanations",
    description: "Get instant, detailed explanations for every question. Our AI breaks down complex concepts into easy-to-understand steps.",
    color: "primary",
  },
  {
    icon: Clock,
    title: "CBT Simulation Mode",
    description: "Practice under real exam conditions with timed tests that mirror the actual CBT environment you'll face.",
    color: "accent",
  },
  {
    icon: BarChart3,
    title: "Performance Analytics",
    description: "Track your progress with detailed analytics. Identify weak areas and focus your study time effectively.",
    color: "success",
  },
  {
    icon: BookOpen,
    title: "Extensive Question Bank",
    description: "Access thousands of past questions and probable questions across all FUTA courses and departments.",
    color: "primary",
  },
  {
    icon: Sparkles,
    title: "Smart Recommendations",
    description: "Our AI learns your strengths and weaknesses to recommend the most effective practice questions for you.",
    color: "accent",
  },
  {
    icon: Shield,
    title: "Verified Content",
    description: "All questions are curated and verified by expert tutors to ensure accuracy and relevance to your exams.",
    color: "success",
  },
];

const getColorClasses = (color: string) => {
  const colors = {
    primary: {
      bg: "bg-primary/10",
      text: "text-primary",
      border: "border-primary/20",
    },
    accent: {
      bg: "bg-accent/10",
      text: "text-accent",
      border: "border-accent/20",
    },
    success: {
      bg: "bg-success/10",
      text: "text-success",
      border: "border-success/20",
    },
  };
  return colors[color as keyof typeof colors] || colors.primary;
};

const FeaturesSection = () => {
  return (
    <section id="features" className="py-20 lg:py-32 bg-background scroll-mt-20">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-4 py-2 mb-6">
            <Zap className="w-4 h-4 text-accent" />
            <span className="text-sm font-medium text-foreground">Powerful Features</span>
          </div>
          <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-6">
            Everything You Need to{" "}
            <span className="text-gradient-primary">Excel</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            Our platform combines cutting-edge AI technology with comprehensive study materials 
            to give you the best exam preparation experience.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
          {features.map((feature, index) => {
            const colorClasses = getColorClasses(feature.color);
            const Icon = feature.icon;
            
            return (
              <div
                key={index}
                className="group bg-card rounded-2xl border border-border p-6 lg:p-8 hover:shadow-xl hover:shadow-glow/5 transition-all duration-300 hover:-translate-y-1"
              >
                <div className={`w-14 h-14 ${colorClasses.bg} rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}>
                  <Icon className={`w-7 h-7 ${colorClasses.text}`} />
                </div>
                <h3 className="font-display text-xl font-bold text-foreground mb-3">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </div>
            );
          })}
        </div>

        {/* Bottom CTA */}
        <div className="mt-16 text-center">
          <div className="inline-flex items-center gap-2 bg-muted rounded-full px-6 py-3">
            <Target className="w-5 h-5 text-primary" />
            <span className="text-foreground font-medium">
              Join over <span className="text-primary font-bold">5,000+</span> students already preparing smarter
            </span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
