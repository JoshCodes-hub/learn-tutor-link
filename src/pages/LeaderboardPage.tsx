import { Link } from "react-router-dom";
import { Leaderboard } from "@/components/student/Leaderboard";
import { SEO } from "@/components/seo/SEO";
import { ArrowLeft } from "lucide-react";
import logo from "@/assets/logo.png";
import DashboardNav from "@/components/layout/DashboardNav";
import { DashboardBreadcrumb } from "@/components/layout/DashboardBreadcrumb";
import { useAuth } from "@/hooks/useAuth";

const LeaderboardPage = () => {
  const { primaryRole } = useAuth();
  const navRole = (primaryRole === "admin" || primaryRole === "tutor" ? primaryRole : "student") as "admin" | "tutor" | "student";
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
                <img 
                  src={logo} 
                  alt="OverraPrep AI FUTA" 
                  className="h-10 w-auto object-contain"
                />
                <span className="font-display font-bold text-lg text-foreground">
                  Leaderboard
                </span>
              </Link>
            </div>
          </div>
        </header>

        <DashboardNav role={navRole} />
        <DashboardBreadcrumb role={navRole} />

        <main className="container mx-auto px-4 py-8 max-w-3xl">
          <Leaderboard />
        </main>
      </div>
    </>
  );
};

export default LeaderboardPage;
