import { Link } from "react-router-dom";
import { Leaderboard } from "@/components/student/Leaderboard";
import { SEO } from "@/components/seo/SEO";
import { BookOpen, Sparkles, ArrowLeft } from "lucide-react";

const LeaderboardPage = () => {
  return (
    <>
      <SEO
        title="Leaderboard - OverraPrep AI"
        description="See the top performers on the platform and compete with other students."
      />
      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="bg-card border-b border-border sticky top-0 z-50">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between h-16">
              <Link to="/student/dashboard" className="flex items-center gap-2 group">
                <ArrowLeft className="w-5 h-5 text-muted-foreground" />
                <div className="relative">
                  <div className="w-10 h-10 bg-gradient-primary rounded-xl flex items-center justify-center shadow-md">
                    <BookOpen className="w-5 h-5 text-primary-foreground" />
                  </div>
                  <Sparkles className="w-4 h-4 text-accent absolute -top-1 -right-1" />
                </div>
                <span className="font-display font-bold text-lg text-foreground">
                  Leaderboard
                </span>
              </Link>
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 py-8 max-w-3xl">
          <Leaderboard />
        </main>
      </div>
    </>
  );
};

export default LeaderboardPage;
