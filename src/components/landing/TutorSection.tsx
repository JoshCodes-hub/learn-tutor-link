import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { 
  GraduationCap, 
  Coins, 
  Users, 
  CheckCircle2, 
  ArrowRight,
  BarChart3,
  Shield,
  Wallet
} from "lucide-react";

const benefits = [
  {
    icon: Coins,
    title: "Earn Revenue",
    description: "Set your own prices and earn money when students purchase your quizzes.",
  },
  {
    icon: Users,
    title: "Reach Thousands",
    description: "Access our growing community of students eager to learn from expert tutors.",
  },
  {
    icon: BarChart3,
    title: "Analytics Dashboard",
    description: "Track your quiz performance, student engagement, and earnings in real-time.",
  },
  {
    icon: Shield,
    title: "Quality Assurance",
    description: "Our admin team reviews content to maintain high educational standards.",
  },
];

const TutorSection = () => {
  const navigate = useNavigate();

  return (
    <section id="tutors" className="py-20 lg:py-32 bg-background overflow-hidden">
      <div className="container mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Left Content */}
          <div>
            <div className="inline-flex items-center gap-2 bg-accent/10 border border-accent/20 rounded-full px-4 py-2 mb-6">
              <GraduationCap className="w-4 h-4 text-accent" />
              <span className="text-sm font-medium text-foreground">For Educators</span>
            </div>
            
            <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-6">
              Become a <span className="text-gradient-accent">Tutor</span> and Share Your Knowledge
            </h2>
            
            <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
              Join our tutor marketplace and turn your expertise into income. Create quality quiz 
              content, help students succeed, and earn revenue based on student engagement.
            </p>

            <div className="space-y-4 mb-8">
              {[
                "Upload free or premium quiz content",
                "Set your own pricing for premium quizzes",
                "Get paid based on student purchases",
                "Access detailed analytics and insights",
              ].map((item, index) => (
                <div key={index} className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-success flex-shrink-0" />
                  <span className="text-foreground">{item}</span>
                </div>
              ))}
            </div>

            <Button variant="accent" size="xl" className="group" onClick={() => navigate("/apply-tutor")}>
              Apply as Tutor
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Button>
          </div>

          {/* Right Content - Benefits Cards */}
          <div className="grid sm:grid-cols-2 gap-4">
            {benefits.map((benefit, index) => {
              const Icon = benefit.icon;
              return (
                <div
                  key={index}
                  className="bg-card rounded-xl border border-border p-5 hover:shadow-lg hover:border-accent/30 transition-all duration-300"
                >
                  <div className="w-12 h-12 bg-accent/10 rounded-xl flex items-center justify-center mb-4">
                    <Icon className="w-6 h-6 text-accent" />
                  </div>
                  <h3 className="font-display font-bold text-foreground mb-2">
                    {benefit.title}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {benefit.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Revenue Model Card */}
        <div className="mt-16 bg-gradient-card rounded-2xl border border-border p-8 lg:p-12">
          <div className="grid lg:grid-cols-3 gap-8 items-center">
            <div className="lg:col-span-2">
              <div className="flex items-center gap-3 mb-4">
                <Wallet className="w-8 h-8 text-accent" />
                <h3 className="font-display text-2xl font-bold text-foreground">
                  Transparent Revenue Model
                </h3>
              </div>
              <p className="text-muted-foreground leading-relaxed">
                When students purchase your premium quizzes, you receive a competitive share of the revenue. 
                Our platform handles all transactions securely, and you can track your earnings and 
                request withdrawals directly from your dashboard.
              </p>
            </div>
            <div className="bg-card rounded-xl border border-border p-6 text-center">
              <p className="text-sm text-muted-foreground mb-2">Tutor Revenue Share</p>
              <p className="font-display text-5xl font-bold text-gradient-accent">70%</p>
              <p className="text-sm text-muted-foreground mt-2">of each quiz sale</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default TutorSection;