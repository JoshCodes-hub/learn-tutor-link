import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Users, GraduationCap, Brain, HelpCircle } from "lucide-react";

interface Stats {
  students: number;
  tutors: number;
  quizzes: number;
  questions: number;
}

const StatsSection = () => {
  const [stats, setStats] = useState<Stats>({
    students: 0,
    tutors: 0,
    quizzes: 0,
    questions: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Count students (users with student role)
        const { count: studentCount } = await supabase
          .from("user_roles")
          .select("*", { count: "exact", head: true })
          .eq("role", "student");

        // Count approved tutors
        const { count: tutorCount } = await supabase
          .from("tutor_applications")
          .select("*", { count: "exact", head: true })
          .eq("status", "approved");

        // Count active quizzes
        const { count: quizCount } = await supabase
          .from("quizzes")
          .select("*", { count: "exact", head: true })
          .eq("is_active", true);

        // Count approved questions
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

  const formatNumber = (num: number) => {
    if (num >= 1000) {
      return (num / 1000).toFixed(1).replace(/\.0$/, "") + "k+";
    }
    return num.toString() + "+";
  };

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
    <section className="py-16 bg-primary/5 border-y border-border">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
          {statsData.map((stat, index) => (
            <div
              key={index}
              className="text-center group"
            >
              <div
                className={`w-14 h-14 ${stat.bgColor} rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform`}
              >
                <stat.icon className={`w-7 h-7 ${stat.color}`} />
              </div>
              <div className="text-3xl md:text-4xl font-bold text-foreground mb-1">
                {isLoading ? (
                  <span className="inline-block w-16 h-8 bg-muted animate-pulse rounded" />
                ) : (
                  formatNumber(stat.value)
                )}
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
