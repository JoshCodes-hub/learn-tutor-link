import { Link } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trophy, Medal, Award, Crown, Loader2, GraduationCap, Flame, ShieldCheck, Users } from "lucide-react";
import { useStudentLeaderboard, useTutorLeaderboard, type StudentRow, type TutorRow } from "@/hooks/useLeaderboards";
import { TeamLeaderboard } from "./TeamLeaderboard";

const rankIcon = (rank: number) => {
  if (rank === 1) return <Crown className="w-5 h-5 text-amber-500" />;
  if (rank === 2) return <Medal className="w-5 h-5 text-zinc-400" />;
  if (rank === 3) return <Award className="w-5 h-5 text-amber-700" />;
  return <span className="w-5 h-5 inline-flex items-center justify-center text-sm font-bold text-muted-foreground">{rank}</span>;
};

const rankBg = (rank: number) => {
  if (rank === 1) return "bg-amber-50/80 border-amber-200";
  if (rank === 2) return "bg-zinc-50 border-zinc-200";
  if (rank === 3) return "bg-amber-50/40 border-amber-200/60";
  return "bg-white border-amber-100/70";
};

function StudentCard({ row, rank }: { row: StudentRow; rank: number }) {
  return (
    <Link
      to={`/profile/${row.user_id}`}
      className={`flex items-center gap-3 p-3.5 rounded-2xl border transition hover:shadow-md ${rankBg(rank)}`}
    >
      <div className="w-7 flex justify-center shrink-0">{rankIcon(rank)}</div>
      <Avatar className="w-11 h-11 border-2 border-white shadow-sm">
        <AvatarImage src={row.avatar_url || undefined} />
        <AvatarFallback className="bg-amber-100 text-amber-800 font-semibold">
          {row.full_name?.charAt(0)?.toUpperCase() || "?"}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-foreground truncate text-[14px]">{row.full_name || "Anonymous"}</p>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11.5px] text-muted-foreground mt-0.5">
          {row.university && (
            <span className="inline-flex items-center gap-1 truncate max-w-[160px]">
              <GraduationCap className="w-3 h-3" /> {row.university}
            </span>
          )}
          <span className="inline-flex items-center gap-1">
            <Flame className="w-3 h-3 text-orange-500" /> {row.streak_days}d streak
          </span>
          <span>{row.quiz_accuracy}% accuracy</span>
        </div>
      </div>
      <div className="text-right shrink-0">
        <p className="font-display text-lg font-bold text-amber-700 tabular-nums">{Math.round(row.score)}</p>
        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">readiness</p>
      </div>
    </Link>
  );
}

function TutorCard({ row, rank }: { row: TutorRow; rank: number }) {
  return (
    <Link
      to={`/profile/${row.tutor_id}`}
      className={`flex items-center gap-3 p-3.5 rounded-2xl border transition hover:shadow-md ${rankBg(rank)}`}
    >
      <div className="w-7 flex justify-center shrink-0">{rankIcon(rank)}</div>
      <Avatar className="w-11 h-11 border-2 border-white shadow-sm">
        <AvatarImage src={row.avatar_url || undefined} />
        <AvatarFallback className="bg-amber-100 text-amber-800 font-semibold">
          {row.full_name?.charAt(0)?.toUpperCase() || "?"}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="font-semibold text-foreground truncate text-[14px]">{row.full_name || "Tutor"}</p>
          <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11.5px] text-muted-foreground mt-0.5">
          <span>{row.uploads_count} uploads</span>
          <span>{row.followers_count} followers</span>
          <span>{row.students_impacted} students</span>
          {row.avg_rating != null && <span>★ {Number(row.avg_rating).toFixed(1)}</span>}
        </div>
      </div>
      <div className="text-right shrink-0">
        <p className="font-display text-lg font-bold text-amber-700 tabular-nums">{Math.round(row.score)}</p>
        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">impact</p>
      </div>
    </Link>
  );
}

export const Leaderboard = () => {
  const students = useStudentLeaderboard(20);
  const tutors = useTutorLeaderboard(20);

  return (
    <div className="bg-card rounded-2xl border border-amber-100/70 p-5 sm:p-6">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
          <Trophy className="w-5 h-5 text-amber-600" />
        </div>
        <div>
          <h2 className="font-display text-xl font-bold text-foreground">Leaderboard</h2>
          <p className="text-sm text-muted-foreground">Celebrate the students and tutors building OverraPrep.</p>
        </div>
      </div>

      <Tabs defaultValue="students" className="w-full">
        <TabsList className="w-full mb-4 grid grid-cols-3 bg-amber-50/60">
          <TabsTrigger value="students">Top Students</TabsTrigger>
          <TabsTrigger value="tutors">Top Tutors</TabsTrigger>
          <TabsTrigger value="teams" className="flex items-center gap-1">
            <Users className="w-3 h-3" /> Teams
          </TabsTrigger>
        </TabsList>

        <TabsContent value="students" className="space-y-2.5">
          {students.isLoading ? (
            <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-amber-600" /></div>
          ) : (students.data?.length ?? 0) === 0 ? (
            <p className="text-center text-muted-foreground py-10 text-sm">No rankings yet — start studying to appear here.</p>
          ) : (
            students.data!.map((row, i) => <StudentCard key={row.user_id} row={row} rank={i + 1} />)
          )}
        </TabsContent>

        <TabsContent value="tutors" className="space-y-2.5">
          {tutors.isLoading ? (
            <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-amber-600" /></div>
          ) : (tutors.data?.length ?? 0) === 0 ? (
            <p className="text-center text-muted-foreground py-10 text-sm">No tutor rankings yet.</p>
          ) : (
            tutors.data!.map((row, i) => <TutorCard key={row.tutor_id} row={row} rank={i + 1} />)
          )}
        </TabsContent>

        <TabsContent value="teams">
          <TeamLeaderboard />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Leaderboard;

interface LeaderboardEntry {
  user_id: string;
  full_name: string;
  profile_image_url: string | null;
  total_score: number;
  quizzes_completed: number;
  accuracy: number;
  rank: number;
}

interface Course {
  id: string;
  code: string;
  name: string;
}

export const Leaderboard = () => {
  const [overallLeaders, setOverallLeaders] = useState<LeaderboardEntry[]>([]);
  const [weeklyLeaders, setWeeklyLeaders] = useState<LeaderboardEntry[]>([]);
  const [courseLeaders, setCourseLeaders] = useState<LeaderboardEntry[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchCourses();
    fetchOverallLeaderboard();
    fetchWeeklyLeaderboard();
  }, []);

  useEffect(() => {
    if (selectedCourse) {
      fetchCourseLeaderboard(selectedCourse);
    }
  }, [selectedCourse]);

  const fetchCourses = async () => {
    const { data } = await supabase
      .from("courses")
      .select("id, code, name")
      .eq("is_active", true)
      .order("code");
    
    if (data && data.length > 0) {
      setCourses(data);
      setSelectedCourse(data[0].id);
    }
  };

  const fetchOverallLeaderboard = async () => {
    setIsLoading(true);
    try {
      const { data: attempts } = await supabase
        .from("quiz_attempts")
        .select("user_id, correct_answers, total_questions, score")
        .not("completed_at", "is", null);

      if (attempts) {
        const userStats = aggregateUserStats(attempts);
        const leaders = await enrichWithProfiles(userStats);
        setOverallLeaders(leaders.slice(0, 10));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const fetchWeeklyLeaderboard = async () => {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const { data: attempts } = await supabase
      .from("quiz_attempts")
      .select("user_id, correct_answers, total_questions, score")
      .not("completed_at", "is", null)
      .gte("completed_at", oneWeekAgo.toISOString());

    if (attempts) {
      const userStats = aggregateUserStats(attempts);
      const leaders = await enrichWithProfiles(userStats);
      setWeeklyLeaders(leaders.slice(0, 10));
    }
  };

  const fetchCourseLeaderboard = async (courseId: string) => {
    const { data: quizzes } = await supabase
      .from("quizzes")
      .select("id")
      .eq("course_id", courseId);

    if (!quizzes || quizzes.length === 0) {
      setCourseLeaders([]);
      return;
    }

    const quizIds = quizzes.map(q => q.id);

    const { data: attempts } = await supabase
      .from("quiz_attempts")
      .select("user_id, correct_answers, total_questions, score")
      .not("completed_at", "is", null)
      .in("quiz_id", quizIds);

    if (attempts) {
      const userStats = aggregateUserStats(attempts);
      const leaders = await enrichWithProfiles(userStats);
      setCourseLeaders(leaders.slice(0, 10));
    }
  };

  const aggregateUserStats = (attempts: any[]) => {
    const userMap: Record<string, { totalScore: number; totalCorrect: number; totalQuestions: number; count: number }> = {};

    attempts.forEach(a => {
      if (!userMap[a.user_id]) {
        userMap[a.user_id] = { totalScore: 0, totalCorrect: 0, totalQuestions: 0, count: 0 };
      }
      userMap[a.user_id].totalScore += a.score || 0;
      userMap[a.user_id].totalCorrect += a.correct_answers || 0;
      userMap[a.user_id].totalQuestions += a.total_questions || 0;
      userMap[a.user_id].count += 1;
    });

    return Object.entries(userMap)
      .map(([user_id, stats]) => ({
        user_id,
        total_score: stats.totalScore,
        quizzes_completed: stats.count,
        accuracy: stats.totalQuestions > 0 ? Math.round((stats.totalCorrect / stats.totalQuestions) * 100) : 0
      }))
      .sort((a, b) => b.total_score - a.total_score);
  };

  const enrichWithProfiles = async (stats: any[]): Promise<LeaderboardEntry[]> => {
    if (stats.length === 0) return [];

    const userIds = stats.map(s => s.user_id);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name, profile_image_url")
      .in("id", userIds);

    const profileMap = (profiles || []).reduce((acc, p) => {
      acc[p.id] = p;
      return acc;
    }, {} as Record<string, any>);

    return stats.map((s, index) => ({
      ...s,
      full_name: profileMap[s.user_id]?.full_name || "Anonymous",
      profile_image_url: profileMap[s.user_id]?.profile_image_url,
      rank: index + 1
    }));
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1: return <Crown className="w-5 h-5 text-yellow-500" />;
      case 2: return <Medal className="w-5 h-5 text-gray-400" />;
      case 3: return <Award className="w-5 h-5 text-amber-600" />;
      default: return <span className="w-5 h-5 flex items-center justify-center text-sm font-bold text-muted-foreground">{rank}</span>;
    }
  };

  const getRankBg = (rank: number) => {
    switch (rank) {
      case 1: return "bg-yellow-500/10 border-yellow-500/30";
      case 2: return "bg-gray-400/10 border-gray-400/30";
      case 3: return "bg-amber-600/10 border-amber-600/30";
      default: return "bg-card border-border";
    }
  };

  const LeaderboardList = ({ leaders }: { leaders: LeaderboardEntry[] }) => (
    <div className="space-y-2">
      {leaders.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">No data available yet</p>
      ) : (
        leaders.map((entry) => (
          <div
            key={entry.user_id}
            className={`flex items-center gap-4 p-4 rounded-xl border transition-all hover:shadow-md ${getRankBg(entry.rank)}`}
          >
            <div className="w-8 flex justify-center">
              {getRankIcon(entry.rank)}
            </div>
            <Avatar className="w-10 h-10 border-2 border-border">
              <AvatarImage src={entry.profile_image_url || undefined} />
              <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                {entry.full_name?.charAt(0)?.toUpperCase() || "?"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-foreground truncate">{entry.full_name}</p>
              <p className="text-sm text-muted-foreground">
                {entry.quizzes_completed} quizzes • {entry.accuracy}% accuracy
              </p>
            </div>
            <div className="text-right">
              <p className="font-display text-xl font-bold text-primary">{entry.total_score}</p>
              <p className="text-xs text-muted-foreground">points</p>
            </div>
          </div>
        ))
      )}
    </div>
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl border border-border p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-yellow-500/10 rounded-lg flex items-center justify-center">
          <Trophy className="w-5 h-5 text-yellow-500" />
        </div>
        <div>
          <h2 className="font-display text-xl font-bold text-foreground">Leaderboard</h2>
          <p className="text-sm text-muted-foreground">Top performers on the platform</p>
        </div>
      </div>

      <Tabs defaultValue="overall" className="w-full">
        <TabsList className="w-full mb-4 grid grid-cols-4">
          <TabsTrigger value="overall">Overall</TabsTrigger>
          <TabsTrigger value="weekly">Weekly</TabsTrigger>
          <TabsTrigger value="course">Course</TabsTrigger>
          <TabsTrigger value="teams" className="flex items-center gap-1">
            <Users className="w-3 h-3" />
            Teams
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overall">
          <LeaderboardList leaders={overallLeaders} />
        </TabsContent>

        <TabsContent value="weekly">
          <LeaderboardList leaders={weeklyLeaders} />
        </TabsContent>

        <TabsContent value="course">
          <Select value={selectedCourse} onValueChange={setSelectedCourse}>
            <SelectTrigger className="mb-4">
              <SelectValue placeholder="Select a course" />
            </SelectTrigger>
            <SelectContent>
              {courses.map(course => (
                <SelectItem key={course.id} value={course.id}>
                  {course.code} - {course.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <LeaderboardList leaders={courseLeaders} />
        </TabsContent>

        <TabsContent value="teams">
          <TeamLeaderboard />
        </TabsContent>
      </Tabs>
    </div>
  );
};
