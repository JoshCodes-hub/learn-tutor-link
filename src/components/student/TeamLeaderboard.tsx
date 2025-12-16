import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Trophy, Medal, Users } from "lucide-react";

interface TeamStats {
  team_id: string;
  team_name: string;
  member_count: number;
  total_score: number;
  total_quizzes: number;
  average_accuracy: number;
  rank: number;
}

export const TeamLeaderboard = () => {
  const [teams, setTeams] = useState<TeamStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTeamLeaderboard();
  }, []);

  const fetchTeamLeaderboard = async () => {
    try {
      // Fetch all teams with their members
      const { data: teamsData, error: teamsError } = await supabase
        .from("teams")
        .select("id, name");

      if (teamsError) throw teamsError;
      if (!teamsData || teamsData.length === 0) {
        setTeams([]);
        setLoading(false);
        return;
      }

      // Fetch all team members
      const { data: membersData, error: membersError } = await supabase
        .from("team_members")
        .select("team_id, user_id");

      if (membersError) throw membersError;

      // Fetch all quiz attempts
      const { data: attemptsData, error: attemptsError } = await supabase
        .from("quiz_attempts")
        .select("user_id, score, correct_answers, total_questions")
        .not("completed_at", "is", null);

      if (attemptsError) throw attemptsError;

      // Calculate team stats
      const teamStats: TeamStats[] = teamsData.map((team) => {
        const teamMembers = membersData?.filter((m) => m.team_id === team.id) || [];
        const memberIds = teamMembers.map((m) => m.user_id);
        
        const teamAttempts = attemptsData?.filter((a) => memberIds.includes(a.user_id)) || [];
        
        const totalScore = teamAttempts.reduce((sum, a) => sum + a.score, 0);
        const totalCorrect = teamAttempts.reduce((sum, a) => sum + a.correct_answers, 0);
        const totalQuestions = teamAttempts.reduce((sum, a) => sum + a.total_questions, 0);
        
        return {
          team_id: team.id,
          team_name: team.name,
          member_count: teamMembers.length,
          total_score: totalScore,
          total_quizzes: teamAttempts.length,
          average_accuracy: totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0,
          rank: 0,
        };
      });

      // Sort by total score and assign ranks
      teamStats.sort((a, b) => b.total_score - a.total_score);
      teamStats.forEach((team, index) => {
        team.rank = index + 1;
      });

      setTeams(teamStats.slice(0, 10));
    } catch (error) {
      console.error("Error fetching team leaderboard:", error);
    } finally {
      setLoading(false);
    }
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Trophy className="w-5 h-5 text-yellow-500" />;
    if (rank === 2) return <Medal className="w-5 h-5 text-gray-400" />;
    if (rank === 3) return <Medal className="w-5 h-5 text-amber-600" />;
    return <span className="w-5 h-5 flex items-center justify-center text-sm font-bold text-muted-foreground">{rank}</span>;
  };

  const getRankBg = (rank: number) => {
    if (rank === 1) return "bg-gradient-to-r from-yellow-500/20 to-yellow-500/5 border-yellow-500/30";
    if (rank === 2) return "bg-gradient-to-r from-gray-400/20 to-gray-400/5 border-gray-400/30";
    if (rank === 3) return "bg-gradient-to-r from-amber-600/20 to-amber-600/5 border-amber-600/30";
    return "bg-muted/30 border-border";
  };

  if (loading) {
    return (
      <div className="space-y-3 py-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-12 bg-muted rounded animate-pulse" />
        ))}
      </div>
    );
  }

  if (teams.length === 0) {
    return (
      <p className="text-center text-muted-foreground py-8">
        No teams yet. Create or join a team to compete!
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {teams.map((team) => (
        <div
          key={team.team_id}
          className={`flex items-center gap-3 p-3 rounded-lg border ${getRankBg(team.rank)}`}
        >
          <div className="flex-shrink-0">{getRankIcon(team.rank)}</div>
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">{team.team_name}</p>
            <p className="text-xs text-muted-foreground">
              {team.member_count} members • {team.total_quizzes} quizzes • {team.average_accuracy}% accuracy
            </p>
          </div>
          <div className="text-right">
            <p className="font-bold text-primary">{team.total_score.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">points</p>
          </div>
        </div>
      ))}
    </div>
  );
};
