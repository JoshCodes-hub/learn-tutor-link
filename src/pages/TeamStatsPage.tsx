import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { SEO } from "@/components/seo/SEO";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ArrowLeft, 
  Users, 
  Trophy, 
  Target, 
  TrendingUp,
  Crown,
  Loader2,
  Calendar,
  BarChart3
} from "lucide-react";
import logo from "@/assets/logo.png";

interface TeamMemberStats {
  user_id: string;
  full_name: string | null;
  profile_image_url: string | null;
  quizzes_completed: number;
  total_score: number;
  accuracy: number;
  contribution_percentage: number;
}

interface WeeklyProgress {
  week: string;
  score: number;
  quizzes: number;
}

interface Team {
  id: string;
  name: string;
  code: string;
  created_by: string;
}

const TeamStatsPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [team, setTeam] = useState<Team | null>(null);
  const [memberStats, setMemberStats] = useState<TeamMemberStats[]>([]);
  const [weeklyProgress, setWeeklyProgress] = useState<WeeklyProgress[]>([]);
  const [totalTeamScore, setTotalTeamScore] = useState(0);
  const [totalQuizzes, setTotalQuizzes] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchTeamStats();
    }
  }, [user]);

  const fetchTeamStats = async () => {
    if (!user) return;

    try {
      // Get user's team
      const { data: membership } = await supabase
        .from("team_members")
        .select("team_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!membership) {
        setLoading(false);
        return;
      }

      // Get team details
      const { data: teamData } = await supabase
        .from("teams")
        .select("*")
        .eq("id", membership.team_id)
        .single();

      if (teamData) {
        setTeam(teamData);
      }

      // Get all team members
      const { data: members } = await supabase
        .from("team_members")
        .select("user_id")
        .eq("team_id", membership.team_id);

      if (!members || members.length === 0) {
        setLoading(false);
        return;
      }

      const memberIds = members.map(m => m.user_id);

      // Get profiles
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, profile_image_url")
        .in("id", memberIds);

      // Get quiz attempts for all members
      const { data: attempts } = await supabase
        .from("quiz_attempts")
        .select("user_id, score, correct_answers, total_questions, completed_at")
        .in("user_id", memberIds)
        .not("completed_at", "is", null);

      // Calculate member stats
      const statsMap: Record<string, { score: number; correct: number; total: number; count: number }> = {};
      let teamTotal = 0;
      let teamQuizzes = 0;

      attempts?.forEach(a => {
        if (!statsMap[a.user_id]) {
          statsMap[a.user_id] = { score: 0, correct: 0, total: 0, count: 0 };
        }
        statsMap[a.user_id].score += a.score;
        statsMap[a.user_id].correct += a.correct_answers;
        statsMap[a.user_id].total += a.total_questions;
        statsMap[a.user_id].count += 1;
        teamTotal += a.score;
        teamQuizzes += 1;
      });

      setTotalTeamScore(teamTotal);
      setTotalQuizzes(teamQuizzes);

      const memberStatsArray: TeamMemberStats[] = memberIds.map(userId => {
        const profile = profiles?.find(p => p.id === userId);
        const stats = statsMap[userId] || { score: 0, correct: 0, total: 0, count: 0 };
        return {
          user_id: userId,
          full_name: profile?.full_name || "Unknown",
          profile_image_url: profile?.profile_image_url || null,
          quizzes_completed: stats.count,
          total_score: stats.score,
          accuracy: stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0,
          contribution_percentage: teamTotal > 0 ? Math.round((stats.score / teamTotal) * 100) : 0
        };
      });

      memberStatsArray.sort((a, b) => b.total_score - a.total_score);
      setMemberStats(memberStatsArray);

      // Calculate weekly progress (last 8 weeks)
      const weeklyData: Record<string, { score: number; quizzes: number }> = {};
      const now = new Date();
      
      for (let i = 7; i >= 0; i--) {
        const weekStart = new Date(now);
        weekStart.setDate(weekStart.getDate() - (i * 7) - weekStart.getDay());
        const weekKey = weekStart.toISOString().split('T')[0];
        weeklyData[weekKey] = { score: 0, quizzes: 0 };
      }

      attempts?.forEach(a => {
        if (a.completed_at) {
          const completedDate = new Date(a.completed_at);
          const weekStart = new Date(completedDate);
          weekStart.setDate(weekStart.getDate() - weekStart.getDay());
          const weekKey = weekStart.toISOString().split('T')[0];
          if (weeklyData[weekKey]) {
            weeklyData[weekKey].score += a.score;
            weeklyData[weekKey].quizzes += 1;
          }
        }
      });

      const weeklyArray = Object.entries(weeklyData).map(([week, data]) => ({
        week: new Date(week).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        score: data.score,
        quizzes: data.quizzes
      }));

      setWeeklyProgress(weeklyArray);
    } catch (error) {
      console.error("Error fetching team stats:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!team) {
    return (
      <>
        <SEO title="Team Stats" description="View your team statistics and member contributions." />
        <div className="min-h-screen bg-background">
          <header className="bg-card border-b border-border sticky top-0 z-50">
            <div className="container mx-auto px-4">
              <div className="flex items-center justify-between h-16">
                <Link to="/student/dashboard" className="flex items-center gap-2">
                  <ArrowLeft className="w-5 h-5 text-muted-foreground" />
                  <img 
                    src={logo} 
                    alt="OverraPrep AI FUTA" 
                    className="h-10 w-auto object-contain"
                  />
                  <span className="font-display font-bold text-lg text-foreground">Team Stats</span>
                </Link>
              </div>
            </div>
          </header>
          <main className="container mx-auto px-4 py-8">
            <Card className="max-w-md mx-auto">
              <CardContent className="p-8 text-center">
                <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h2 className="text-xl font-bold mb-2">No Team Found</h2>
                <p className="text-muted-foreground mb-4">Join or create a team to see statistics.</p>
                <Button onClick={() => navigate("/student/dashboard")}>Back to Dashboard</Button>
              </CardContent>
            </Card>
          </main>
        </div>
      </>
    );
  }

  const maxWeeklyScore = Math.max(...weeklyProgress.map(w => w.score), 1);

  return (
    <>
      <SEO title={`${team.name} - Team Stats`} description="View your team statistics and member contributions." />
      <div className="min-h-screen bg-background">
        <header className="bg-card border-b border-border sticky top-0 z-50">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between h-16">
              <Link to="/student/dashboard" className="flex items-center gap-2">
                <ArrowLeft className="w-5 h-5 text-muted-foreground" />
                <img 
                  src={logo} 
                  alt="OverraPrep AI FUTA" 
                  className="h-10 w-auto object-contain"
                />
                <span className="font-display font-bold text-lg text-foreground">{team.name}</span>
              </Link>
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 py-8 max-w-4xl">
          {/* Team Overview */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <Card>
              <CardContent className="p-4 text-center">
                <Users className="w-6 h-6 text-primary mx-auto mb-2" />
                <p className="text-2xl font-bold">{memberStats.length}</p>
                <p className="text-sm text-muted-foreground">Members</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <Trophy className="w-6 h-6 text-yellow-500 mx-auto mb-2" />
                <p className="text-2xl font-bold">{totalTeamScore.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">Total Score</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <Target className="w-6 h-6 text-success mx-auto mb-2" />
                <p className="text-2xl font-bold">{totalQuizzes}</p>
                <p className="text-sm text-muted-foreground">Quizzes</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <TrendingUp className="w-6 h-6 text-accent mx-auto mb-2" />
                <p className="text-2xl font-bold">
                  {memberStats.length > 0 ? Math.round(memberStats.reduce((sum, m) => sum + m.accuracy, 0) / memberStats.length) : 0}%
                </p>
                <p className="text-sm text-muted-foreground">Avg Accuracy</p>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="members" className="space-y-6">
            <TabsList className="w-full grid grid-cols-2">
              <TabsTrigger value="members">Member Contributions</TabsTrigger>
              <TabsTrigger value="progress">Weekly Progress</TabsTrigger>
            </TabsList>

            <TabsContent value="members">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-primary" />
                    Member Contributions
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {memberStats.map((member, index) => (
                    <div key={member.user_id} className="space-y-2">
                      <div className="flex items-center gap-3">
                        <span className="w-6 text-center font-bold text-muted-foreground">
                          {index === 0 && <Crown className="w-5 h-5 text-yellow-500 inline" />}
                          {index > 0 && `#${index + 1}`}
                        </span>
                        <Avatar className="w-8 h-8">
                          <AvatarImage src={member.profile_image_url || undefined} />
                          <AvatarFallback className="bg-primary/10 text-primary text-sm">
                            {member.full_name?.charAt(0)?.toUpperCase() || "?"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{member.full_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {member.quizzes_completed} quizzes • {member.accuracy}% accuracy
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-primary">{member.total_score.toLocaleString()}</p>
                          <p className="text-xs text-muted-foreground">{member.contribution_percentage}% contribution</p>
                        </div>
                      </div>
                      <Progress value={member.contribution_percentage} className="h-2" />
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="progress">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-primary" />
                    Weekly Progress (Last 8 Weeks)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {weeklyProgress.map((week, index) => (
                      <div key={index} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">{week.week}</span>
                          <span className="font-medium">
                            {week.score.toLocaleString()} pts • {week.quizzes} quizzes
                          </span>
                        </div>
                        <div className="h-6 bg-muted rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-primary to-primary/70 rounded-full transition-all"
                            style={{ width: `${(week.score / maxWeeklyScore) * 100}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </>
  );
};

export default TeamStatsPage;