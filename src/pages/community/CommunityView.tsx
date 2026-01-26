import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useStudentCommunity } from "@/hooks/useTutorCommunity";
import { CommunityAnnouncements } from "@/components/community/CommunityAnnouncements";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BookOpen,
  Sparkles,
  ArrowLeft,
  Users,
  Clock,
  Brain,
  Coins,
  Play,
  Target,
  Loader2,
  LogOut,
  UserPlus,
  Megaphone,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import logo from "@/assets/logo.png";
import { toast } from "sonner";

interface TutorProfile {
  id: string;
  full_name: string | null;
  profile_image_url: string | null;
  tutor_code: string | null;
}

const CommunityView = () => {
  const { communityId } = useParams<{ communityId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    currentCommunity,
    sharedQuizzes,
    isMember,
    isLoading,
    joinCommunity,
    leaveCommunity,
  } = useStudentCommunity(communityId);
  
  const [tutor, setTutor] = useState<TutorProfile | null>(null);
  const [memberCount, setMemberCount] = useState(0);
  const [isJoining, setIsJoining] = useState(false);

  useEffect(() => {
    const fetchTutorAndMembers = async () => {
      if (!currentCommunity) return;

      // Fetch tutor profile
      const { data: tutorData } = await supabase
        .from("profiles")
        .select("id, full_name, profile_image_url, tutor_code")
        .eq("id", currentCommunity.tutor_id)
        .single();

      if (tutorData) {
        setTutor(tutorData);
      }

      // Fetch member count
      const { count } = await supabase
        .from("community_members")
        .select("*", { count: "exact", head: true })
        .eq("community_id", currentCommunity.id);

      setMemberCount(count || 0);
    };

    fetchTutorAndMembers();
  }, [currentCommunity]);

  const handleJoin = async () => {
    if (!currentCommunity) return;
    setIsJoining(true);
    await joinCommunity(currentCommunity.invite_code);
    setIsJoining(false);
  };

  const handleLeave = async () => {
    if (!communityId) return;
    await leaveCommunity(communityId);
    navigate("/student/dashboard");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading community...</p>
        </div>
      </div>
    );
  }

  if (!currentCommunity) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-foreground font-medium mb-4">Community not found</p>
          <Button variant="outline" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center group">
              <img
                src={logo}
                alt="OverraPrep AI FUTA"
                className="h-10 w-auto object-contain"
              />
            </Link>

            <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Community Header */}
        <div className="bg-card rounded-2xl border border-border p-6 md:p-8 mb-8">
          <div className="flex flex-col md:flex-row items-start gap-6">
            {tutor && (
              <Avatar className="w-20 h-20 border-4 border-primary/20">
                <AvatarImage src={tutor.profile_image_url || undefined} />
                <AvatarFallback className="bg-primary/10 text-primary text-2xl">
                  {tutor.full_name?.charAt(0) || "T"}
                </AvatarFallback>
              </Avatar>
            )}

            <div className="flex-1">
              <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-2">
                {currentCommunity.name}
              </h1>
              
              <div className="flex items-center gap-3 mb-3">
                <Link
                  to={`/tutor/${currentCommunity.tutor_id}`}
                  className="text-sm text-primary hover:underline"
                >
                  by {tutor?.full_name || "Tutor"}
                </Link>
                {tutor?.tutor_code && (
                  <Badge variant="secondary" className="font-mono text-xs">
                    {tutor.tutor_code}
                  </Badge>
                )}
              </div>

              {currentCommunity.description && (
                <p className="text-muted-foreground mb-4">
                  {currentCommunity.description}
                </p>
              )}

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Users className="w-4 h-4" />
                  {memberCount} members
                </div>

                {user && (
                  <div>
                    {isMember ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleLeave}
                      >
                        <LogOut className="w-4 h-4 mr-2" />
                        Leave
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        onClick={handleJoin}
                        disabled={isJoining}
                      >
                        {isJoining ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <UserPlus className="w-4 h-4 mr-2" />
                        )}
                        Join Community
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Content Tabs for Members */}
        {isMember ? (
          <Tabs defaultValue="quizzes" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="quizzes" className="flex items-center gap-2">
                <BookOpen className="w-4 h-4" />
                Shared Quizzes
              </TabsTrigger>
              <TabsTrigger value="announcements" className="flex items-center gap-2">
                <Megaphone className="w-4 h-4" />
                Announcements
              </TabsTrigger>
            </TabsList>

            <TabsContent value="quizzes">
              {sharedQuizzes.length === 0 ? (
                <div className="bg-muted/30 rounded-xl p-8 text-center">
                  <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-foreground font-medium mb-2">No quizzes shared yet</p>
                  <p className="text-sm text-muted-foreground">
                    Check back later for new quizzes from your tutor.
                  </p>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {sharedQuizzes.map((shared) => (
                    <div
                      key={shared.id}
                      className="bg-card rounded-xl border border-border p-5 hover:shadow-lg hover:border-primary/30 transition-all duration-300"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="secondary" className="text-xs">
                              {shared.quiz?.course?.code || "Quiz"}
                            </Badge>
                            {shared.quiz?.is_simulation && (
                              <Badge variant="outline" className="text-xs">
                                CBT
                              </Badge>
                            )}
                            {shared.quiz?.is_premium && (
                              <Badge variant="outline" className="text-xs text-accent">
                                <Coins className="w-3 h-3 mr-1" />
                                {shared.quiz.token_cost}
                              </Badge>
                            )}
                          </div>
                          <h3 className="font-display font-semibold text-foreground">
                            {shared.quiz?.title || "Quiz"}
                          </h3>
                        </div>
                      </div>

                      {shared.message && (
                        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                          "{shared.message}"
                        </p>
                      )}

                      <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                        <span className="flex items-center gap-1">
                          <Brain className="w-4 h-4" />
                          {shared.quiz?.question_count} questions
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {shared.quiz?.duration_minutes} min
                        </span>
                      </div>

                      <div className="text-xs text-muted-foreground mb-3">
                        Shared {formatDistanceToNow(new Date(shared.shared_at), { addSuffix: true })}
                      </div>

                      <div className="flex gap-2">
                        <Button
                          variant="default"
                          size="sm"
                          className="flex-1"
                          onClick={() => navigate(`/quiz/${shared.quiz_id}/practice`)}
                        >
                          <Play className="w-4 h-4 mr-1" />
                          Practice
                        </Button>
                        {shared.quiz?.is_simulation && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1"
                            onClick={() => navigate(`/quiz/${shared.quiz_id}/simulation`)}
                          >
                            <Target className="w-4 h-4 mr-1" />
                            CBT Mode
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="announcements">
              <CommunityAnnouncements communityId={currentCommunity.id} isTutor={false} />
            </TabsContent>
          </Tabs>
        ) : (
          <div className="bg-muted/30 rounded-xl p-8 text-center">
            <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-foreground font-medium mb-2">Join to access quizzes</p>
            <p className="text-sm text-muted-foreground mb-4">
              Join this community to view and practice the quizzes shared by {tutor?.full_name || "the tutor"}.
            </p>
            {user ? (
              <Button onClick={handleJoin} disabled={isJoining}>
                {isJoining ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <UserPlus className="w-4 h-4 mr-2" />
                )}
                Join Community
              </Button>
            ) : (
              <Button onClick={() => navigate("/auth")}>
                Sign In to Join
              </Button>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default CommunityView;
