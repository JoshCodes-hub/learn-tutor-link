import { useState } from "react";
import { Button } from "@/components/ui/button";
import { GraduationCap, Coins, Users, CheckCircle2, ArrowRight, BarChart3, Shield, Wallet } from "lucide-react";
import TutorApplicationDialog from "./TutorApplicationDialog";

const benefits = [
  { icon: Coins, title: "Earn Revenue", description: "Set your own prices and earn money when students purchase your quizzes." },
  { icon: Users, title: "Reach Thousands", description: "Access our growing community of students eager to learn from expert tutors." },
  { icon: BarChart3, title: "Analytics Dashboard", description: "Track your quiz performance, student engagement, and earnings in real-time." },
  { icon: Shield, title: "Quality Assurance", description: "Our admin team reviews content to maintain high educational standards." },
];

const TutorSection = () => {
  const [showApplicationDialog, setShowApplicationDialog] = useState(false);

  return (
    <>
    <section id="become-tutor" className="py-20 lg:py-28 bg-background overflow-hidden scroll-mt-20">
      <div className="container mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <div>
            <p className="text-primary font-medium text-sm tracking-[0.15em] uppercase mb-4">For Educators</p>
            
            <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-6">
              Become a <span className="text-gradient-primary">Tutor</span>
            </h2>
            
            <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
              Join our tutor marketplace and turn your expertise into income. Create quality quiz 
              content, help students succeed, and earn revenue.
            </p>

            <div className="space-y-3 mb-8">
              {["Upload free or premium quiz content", "Set your own pricing for premium quizzes", "Get paid based on student purchases", "Access detailed analytics and insights"].map((item, index) => (
                <div key={index} className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0" />
                  <span className="text-foreground">{item}</span>
                </div>
              ))}
            </div>

            <Button variant="hero" size="xl" className="group" onClick={() => setShowApplicationDialog(true)}>
              Apply as Tutor
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Button>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            {benefits.map((benefit, index) => {
              const Icon = benefit.icon;
              return (
                <div key={index} className="glass-card glass-card-hover rounded-xl p-5">
                  <div className="w-11 h-11 bg-primary/10 rounded-xl flex items-center justify-center mb-4">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="font-display font-bold text-foreground mb-2">{benefit.title}</h3>
                  <p className="text-sm text-muted-foreground">{benefit.description}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Revenue card */}
        <div className="mt-14 glass-card rounded-2xl p-8 lg:p-12">
          <div className="grid lg:grid-cols-3 gap-8 items-center">
            <div className="lg:col-span-2">
              <div className="flex items-center gap-3 mb-4">
                <Wallet className="w-7 h-7 text-primary" />
                <h3 className="font-display text-2xl font-bold text-foreground">Transparent Revenue</h3>
              </div>
              <p className="text-muted-foreground leading-relaxed">
                When students purchase your premium quizzes, you receive a competitive share of the revenue. 
                Our platform handles all transactions securely, and you can track your earnings and 
                request withdrawals directly from your dashboard.
              </p>
            </div>
            <div className="bg-primary/5 border border-primary/15 rounded-xl p-6 text-center">
              <p className="text-sm text-muted-foreground mb-2">Tutor Revenue Share</p>
              <p className="font-display text-5xl font-bold text-gradient-primary">70%</p>
              <p className="text-sm text-muted-foreground mt-2">of each quiz sale</p>
            </div>
          </div>
        </div>
      </div>
    </section>
    
    <TutorApplicationDialog open={showApplicationDialog} onOpenChange={setShowApplicationDialog} />
    </>
  );
};

export default TutorSection;
