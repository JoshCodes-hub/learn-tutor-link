import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Users, GraduationCap, Brain, HelpCircle } from "lucide-react";

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
      
      // Easing function for smooth animation
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
    return <span className="inline-block w-16 h-8 bg-muted animate-pulse rounded" />;
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
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
    {
      icon: GraduationCap,
      value: stats.tutors,
      label: "Verified Tutors",
      color: "text-green-500",
      bgColor: "bg-green-500/10",
    },
    {
      icon: Brain,
      value: stats.quizzes,
      label: "Quizzes Available",
      color: "text-purple-500",
      bgColor: "bg-purple-500/10",
    },
    {
      icon: HelpCircle,
      value: stats.questions,
      label: "Practice Questions",
      color: "text-orange-500",
      bgColor: "bg-orange-500/10",
    },
  ];

  return (
    <section ref={sectionRef} className="py-16 bg-primary/5 border-y border-border">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
          {statsData.map((stat, index) => (
            <div
              key={index}
              className="text-center group"
              style={{ 
                animationDelay: `${index * 100}ms`,
                opacity: isVisible ? 1 : 0,
                transform: isVisible ? 'translateY(0)' : 'translateY(20px)',
                transition: `opacity 0.5s ease-out ${index * 100}ms, transform 0.5s ease-out ${index * 100}ms`
              }}
            >
              <div
                className={`w-14 h-14 ${stat.bgColor} rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform`}
              >
                <stat.icon className={`w-7 h-7 ${stat.color}`} />
              </div>
              <div className="text-3xl md:text-4xl font-bold text-foreground mb-1">
                <AnimatedCounter 
                  value={stat.value} 
                  isVisible={isVisible} 
                  isLoading={isLoading} 
                />
              </div>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default StatsSection;
