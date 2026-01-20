import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Users, GraduationCap, Brain, HelpCircle, TrendingUp } from "lucide-react";

interface Stats {
  students: number;
  tutors: number;
  quizzes: number;
  questions: number;
}

const useCountUp = (end: number, duration: number = 2000, start: boolean = false) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!start || end === 0) {
      if (start) setCount(end);
      return;
    }

    let startTime: number | null = null;
    let animationFrame: number;

    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime;
      const progress = Math.min((currentTime - startTime) / duration, 1);
      
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      setCount(Math.floor(easeOutQuart * end));

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    animationFrame = requestAnimationFrame(animate);

    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, [end, duration, start]);

  return count;
};

const AnimatedCounter = ({ 
  value, 
  isVisible, 
  isLoading 
}: { 
  value: number; 
  isVisible: boolean; 
  isLoading: boolean;
}) => {
  const count = useCountUp(value, 2000, isVisible && !isLoading);

  const formatNumber = (num: number) => {
    if (num >= 1000) {
      return (num / 1000).toFixed(1).replace(/\.0$/, "") + "k+";
    }
    return num.toString() + "+";
  };

  if (isLoading) {
    return <span className="inline-block w-20 h-10 bg-muted/50 animate-pulse rounded-lg" />;
  }

  return <span>{formatNumber(count)}</span>;
};

const StatsSection = () => {
  const [stats, setStats] = useState<Stats>({
    students: 0,
    tutors: 0,
    quizzes: 0,
    questions: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.3 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const { count: studentCount } = await supabase
          .from("user_roles")
          .select("*", { count: "exact", head: true })
          .eq("role", "student");

        const { count: tutorCount } = await supabase
          .from("tutor_applications")
          .select("*", { count: "exact", head: true })
          .eq("status", "approved");

        const { count: quizCount } = await supabase
          .from("quizzes")
          .select("*", { count: "exact", head: true })
          .eq("is_active", true);

        const { count: questionCount } = await supabase
          .from("questions")
          .select("*", { count: "exact", head: true })
          .eq("is_approved", true);

        setStats({
          students: studentCount || 0,
          tutors: tutorCount || 0,
          quizzes: quizCount || 0,
          questions: questionCount || 0,
        });
      } catch (error) {
        console.error("Error fetching stats:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, []);

  const statsData = [
    {
      icon: Users,
      value: stats.students,
      label: "Active Students",
      description: "Learning every day",
      gradient: "from-blue-500 to-cyan-500",
      bgGradient: "from-blue-500/10 to-cyan-500/10",
    },
    {
      icon: GraduationCap,
      value: stats.tutors,
      label: "Expert Tutors",
      description: "Verified educators",
      gradient: "from-emerald-500 to-teal-500",
      bgGradient: "from-emerald-500/10 to-teal-500/10",
    },
    {
      icon: Brain,
      value: stats.quizzes,
      label: "Available Quizzes",
      description: "Ready to practice",
      gradient: "from-purple-500 to-pink-500",
      bgGradient: "from-purple-500/10 to-pink-500/10",
    },
    {
      icon: HelpCircle,
      value: stats.questions,
      label: "Practice Questions",
      description: "Curated content",
      gradient: "from-orange-500 to-amber-500",
      bgGradient: "from-orange-500/10 to-amber-500/10",
    },
  ];

  return (
    <section ref={sectionRef} className="py-16 md:py-20 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-primary/5 to-background" />
      
      <div className="container mx-auto px-4 relative z-10">
        {/* Section header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-4 py-2 mb-4">
            <TrendingUp className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold text-foreground">Platform Statistics</span>
          </div>
          <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground">
            Trusted by Thousands of Students
          </h2>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {statsData.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <div
                key={index}
                className="group relative"
                style={{ 
                  animationDelay: `${index * 100}ms`,
                  opacity: isVisible ? 1 : 0,
                  transform: isVisible ? 'translateY(0)' : 'translateY(30px)',
                  transition: `opacity 0.6s ease-out ${index * 100}ms, transform 0.6s ease-out ${index * 100}ms`
                }}
              >
                <div className="glass-card glass-card-hover rounded-2xl p-6 h-full text-center">
                  {/* Icon */}
                  <div className={`w-14 h-14 mx-auto mb-4 rounded-2xl bg-gradient-to-br ${stat.bgGradient} flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${stat.gradient} flex items-center justify-center shadow-lg`}>
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                  </div>
                  
                  {/* Value */}
                  <div className="text-3xl md:text-4xl font-bold text-foreground mb-1 font-display">
                    <AnimatedCounter 
                      value={stat.value} 
                      isVisible={isVisible} 
                      isLoading={isLoading} 
                    />
                  </div>
                  
                  {/* Label */}
                  <p className="text-sm font-semibold text-foreground mb-0.5">{stat.label}</p>
                  <p className="text-xs text-muted-foreground">{stat.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default StatsSection;
