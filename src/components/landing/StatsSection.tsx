import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Users, GraduationCap, Brain, HelpCircle } from "lucide-react";

interface Stats { students: number; tutors: number; quizzes: number; questions: number; }

const useCountUp = (end: number, duration: number = 2000, start: boolean = false) => {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!start || end === 0) { if (start) setCount(end); return; }
    let startTime: number | null = null;
    let animationFrame: number;
    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime;
      const progress = Math.min((currentTime - startTime) / duration, 1);
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      setCount(Math.floor(easeOutQuart * end));
      if (progress < 1) animationFrame = requestAnimationFrame(animate);
    };
    animationFrame = requestAnimationFrame(animate);
    return () => { if (animationFrame) cancelAnimationFrame(animationFrame); };
  }, [end, duration, start]);
  return count;
};

const AnimatedCounter = ({ value, isVisible, isLoading }: { value: number; isVisible: boolean; isLoading: boolean; }) => {
  const count = useCountUp(value, 2000, isVisible && !isLoading);
  const formatNumber = (num: number) => num >= 1000 ? (num / 1000).toFixed(1).replace(/\.0$/, "") + "k+" : num.toString() + "+";
  if (isLoading) return <span className="inline-block w-16 h-8 bg-primary/10 animate-pulse rounded" />;
  return <span>{formatNumber(count)}</span>;
};

const StatsSection = () => {
  const [stats, setStats] = useState<Stats>({ students: 0, tutors: 0, quizzes: 0, questions: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setIsVisible(true); observer.disconnect(); }
    }, { threshold: 0.3 });
    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const { count: studentCount } = await supabase.from("user_roles").select("*", { count: "exact", head: true }).eq("role", "student");
        const { count: tutorCount } = await supabase.from("tutor_applications").select("*", { count: "exact", head: true }).eq("status", "approved");
        const { count: quizCount } = await supabase.from("quizzes").select("*", { count: "exact", head: true }).eq("is_active", true);
        const { count: questionCount } = await supabase.from("questions").select("*", { count: "exact", head: true }).eq("is_approved", true);
        setStats({ students: studentCount || 0, tutors: tutorCount || 0, quizzes: quizCount || 0, questions: questionCount || 0 });
      } catch (error) { console.error("Error fetching stats:", error); }
      finally { setIsLoading(false); }
    };
    fetchStats();
  }, []);

  const statsData = [
    { icon: Users, value: stats.students, label: "Active Students", description: "Learning daily" },
    { icon: GraduationCap, value: stats.tutors, label: "Expert Tutors", description: "Verified educators" },
    { icon: Brain, value: stats.quizzes, label: "Available Quizzes", description: "Ready to practice" },
    { icon: HelpCircle, value: stats.questions, label: "Practice Questions", description: "Curated content" },
  ];

  return (
    <section ref={sectionRef} className="py-16 md:py-20 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-background via-primary/[0.03] to-background" />
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center mb-10">
          <p className="text-primary font-medium text-sm tracking-[0.15em] uppercase mb-3">Our Impact</p>
          <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground">
            Trusted by Thousands
          </h2>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 max-w-4xl mx-auto">
          {statsData.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <div
                key={index}
                className="group text-center"
                style={{ 
                  opacity: isVisible ? 1 : 0,
                  transform: isVisible ? 'translateY(0)' : 'translateY(20px)',
                  transition: `opacity 0.6s ease-out ${index * 100}ms, transform 0.6s ease-out ${index * 100}ms`
                }}
              >
                <div className="glass-card glass-card-hover rounded-2xl p-6 h-full">
                  <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <Icon className="w-6 h-6 text-primary" />
                  </div>
                  <div className="text-3xl md:text-4xl font-bold text-foreground mb-1 font-display">
                    <AnimatedCounter value={stat.value} isVisible={isVisible} isLoading={isLoading} />
                  </div>
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
