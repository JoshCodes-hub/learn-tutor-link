import { 
  Brain, 
  Clock, 
  BarChart3, 
  Sparkles, 
  BookOpen, 
  Shield,
  Zap,
  Target,
  ArrowRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import studentsGroup from "@/assets/students-group.jpg";

const features = [
  {
    icon: Brain,
    title: "AI-Powered Explanations",
    description: "Get instant, detailed explanations for every question. Our AI breaks down complex concepts into easy-to-understand steps.",
    gradient: "from-primary to-teal-600",
    bgGradient: "from-primary/10 to-teal-600/10",
  },
  {
    icon: Clock,
    title: "CBT Simulation Mode",
    description: "Practice under real exam conditions with timed tests that mirror the actual CBT environment you'll face.",
    gradient: "from-accent to-orange-500",
    bgGradient: "from-accent/10 to-orange-500/10",
  },
  {
    icon: BarChart3,
    title: "Performance Analytics",
    description: "Track your progress with detailed analytics. Identify weak areas and focus your study time effectively.",
    gradient: "from-success to-emerald-600",
    bgGradient: "from-success/10 to-emerald-600/10",
  },
  {
    icon: BookOpen,
    title: "Extensive Question Bank",
    description: "Access thousands of past questions and probable questions across all FUTA courses and departments.",
    gradient: "from-blue-500 to-indigo-600",
    bgGradient: "from-blue-500/10 to-indigo-600/10",
  },
  {
    icon: Sparkles,
    title: "Smart Recommendations",
    description: "Our AI learns your strengths and weaknesses to recommend the most effective practice questions for you.",
    gradient: "from-purple-500 to-pink-500",
    bgGradient: "from-purple-500/10 to-pink-500/10",
  },
  {
    icon: Shield,
    title: "Verified Content",
    description: "All questions are curated and verified by expert tutors to ensure accuracy and relevance to your exams.",
    gradient: "from-cyan-500 to-blue-500",
    bgGradient: "from-cyan-500/10 to-blue-500/10",
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: {
      duration: 0.6,
      ease: "easeOut" as const,
    },
  },
};

const FeaturesSection = () => {
  const navigate = useNavigate();

  return (
    <section id="features" className="py-20 lg:py-32 relative overflow-hidden scroll-mt-20" aria-labelledby="features-heading">
      {/* Background */}
      <div className="absolute inset-0 bg-background" />
      <div className="absolute inset-0 bg-gradient-mesh opacity-30" />
      
      {/* Subtle student image background */}
      <div className="absolute inset-0 overflow-hidden">
        <div 
          className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05]"
          style={{
            backgroundImage: `url(${studentsGroup})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
          }}
        />
      </div>
      
      <div className="container mx-auto px-4 relative z-10">
        {/* Section Header */}
        <motion.div 
          className="text-center max-w-3xl mx-auto mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-4 py-2 mb-6 backdrop-blur-sm">
            <Zap className="w-4 h-4 text-accent" />
            <span className="text-sm font-semibold text-foreground">Powerful Features</span>
          </div>
          <h2 id="features-heading" className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-6 text-balance">
            Everything You Need to{" "}
            <span className="text-gradient-primary">Excel</span>
          </h2>
          <p className="text-lg text-muted-foreground leading-relaxed">
            Our platform combines cutting-edge AI technology with comprehensive study materials 
            to give you the best exam preparation experience.
          </p>
        </motion.div>

        {/* Features Grid */}
        <motion.div 
          className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
        >
          {features.map((feature, index) => {
            const Icon = feature.icon;
            
            return (
              <motion.div
                key={index}
                className="group glass-card glass-card-hover rounded-2xl p-6 lg:p-8"
                variants={cardVariants}
                whileHover={{ y: -4, scale: 1.02 }}
                transition={{ duration: 0.3 }}
              >
                {/* Icon */}
                <div className="relative w-14 h-14 mb-6">
                  <motion.div 
                    className={`absolute inset-0 bg-gradient-to-br ${feature.bgGradient} rounded-xl blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300`}
                    initial={{ scale: 0.8 }}
                    whileHover={{ scale: 1.2 }}
                  />
                  <div className={`relative w-full h-full bg-gradient-to-br ${feature.gradient} rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                    <Icon className="w-7 h-7 text-white" />
                  </div>
                </div>
                
                {/* Content */}
                <h3 className="font-display text-xl font-bold text-foreground mb-3 group-hover:text-primary transition-colors">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </motion.div>
            );
          })}
        </motion.div>

        {/* Bottom CTA */}
        <motion.div 
          className="mt-16 text-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
        >
          <div className="inline-flex flex-col sm:flex-row items-center gap-4 p-6 glass-card rounded-2xl">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-primary rounded-xl flex items-center justify-center">
                <Target className="w-6 h-6 text-primary-foreground" />
              </div>
              <div className="text-left">
                <p className="font-display font-bold text-foreground">Join 5,000+ Students</p>
                <p className="text-sm text-muted-foreground">Already preparing smarter</p>
              </div>
            </div>
            <Button 
              variant="hero" 
              size="lg" 
              className="group"
              onClick={() => navigate("/auth")}
            >
              Get Started Free
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Button>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default FeaturesSection;
