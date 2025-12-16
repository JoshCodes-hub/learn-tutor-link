import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Flame, Target, Calendar, TrendingUp, Loader2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface StreakData {
  current_streak: number;
  longest_streak: number;
  last_activity_date: string | null;
  daily_goal_quizzes: number;
}

export const StudyStreak = () => {
  const { user } = useAuth();
  const [streak, setStreak] = useState<StreakData | null>(null);
  const [todayQuizzes, setTodayQuizzes] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchStreakData();
    }
  }, [user]);

  const fetchStreakData = async () => {
    if (!user) return;
    
    try {
      // Fetch streak data
      const { data: streakData } = await supabase
        .from("study_streaks")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (streakData) {
        setStreak(streakData);
      } else {
        // Initialize streak if doesn't exist
        setStreak({
          current_streak: 0,
          longest_streak: 0,
          last_activity_date: null,
          daily_goal_quizzes: 1
        });
      }

      // Count today's completed quizzes
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const { count } = await supabase
        .from("quiz_attempts")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .not("completed_at", "is", null)
        .gte("completed_at", today.toISOString());

      setTodayQuizzes(count || 0);
    } finally {
      setIsLoading(false);
    }
  };

  const getStreakMessage = () => {
    if (!streak) return "Start your streak today!";
    if (streak.current_streak === 0) return "Complete a quiz to start your streak!";
    if (streak.current_streak >= 30) return "🔥 Legendary! Month-long streak!";
    if (streak.current_streak >= 7) return "🎯 Week warrior! Keep it up!";
    if (streak.current_streak >= 3) return "💪 Building momentum!";
    return "🚀 Great start! Keep going!";
  };

  const dailyGoal = streak?.daily_goal_quizzes || 1;
  const goalProgress = Math.min((todayQuizzes / dailyGoal) * 100, 100);
  const goalMet = todayQuizzes >= dailyGoal;

  if (isLoading) {
    return (
      <div className="bg-card rounded-xl border border-border p-6 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl border border-border p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
          streak && streak.current_streak > 0 ? "bg-orange-500/10" : "bg-muted"
        }`}>
          <Flame className={`w-5 h-5 ${
            streak && streak.current_streak > 0 ? "text-orange-500" : "text-muted-foreground"
          }`} />
        </div>
        <div>
          <h2 className="font-display text-xl font-bold text-foreground">Study Streak</h2>
          <p className="text-sm text-muted-foreground">{getStreakMessage()}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-gradient-to-br from-orange-500/10 to-red-500/10 rounded-xl p-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            <Flame className="w-5 h-5 text-orange-500" />
            <span className="font-display text-3xl font-bold text-foreground">
              {streak?.current_streak || 0}
            </span>
          </div>
          <p className="text-sm text-muted-foreground">Current Streak</p>
        </div>

        <div className="bg-muted/50 rounded-xl p-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            <TrendingUp className="w-5 h-5 text-primary" />
            <span className="font-display text-3xl font-bold text-foreground">
              {streak?.longest_streak || 0}
            </span>
          </div>
          <p className="text-sm text-muted-foreground">Best Streak</p>
        </div>
      </div>

      {/* Daily Goal Progress */}
      <div className="bg-muted/30 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-primary" />
            <span className="font-medium text-foreground">Daily Goal</span>
          </div>
          <span className={`text-sm font-semibold ${goalMet ? "text-success" : "text-muted-foreground"}`}>
            {todayQuizzes}/{dailyGoal} {goalMet ? "✓" : ""}
          </span>
        </div>
        <Progress value={goalProgress} className="h-2" />
        <p className="text-xs text-muted-foreground mt-2">
          {goalMet 
            ? "Great job! You've met your daily goal!" 
            : `Complete ${dailyGoal - todayQuizzes} more quiz${dailyGoal - todayQuizzes !== 1 ? "zes" : ""} today`
          }
        </p>
      </div>

      {/* Streak Calendar Preview */}
      <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
        <Calendar className="w-4 h-4" />
        <span>
          {streak?.last_activity_date 
            ? `Last active: ${new Date(streak.last_activity_date).toLocaleDateString()}`
            : "Start studying to build your streak!"
          }
        </span>
      </div>
    </div>
  );
};
