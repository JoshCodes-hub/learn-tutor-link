import { useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useOnboarding } from "@/hooks/useOnboarding";
import { Button } from "@/components/ui/button";
import { OnboardingDialog } from "@/components/onboarding/OnboardingDialog";
import { SEO } from "@/components/seo/SEO";
import { 
  LogOut, 
  User, 
  GraduationCap, 
  Shield,
  Brain,
  Target,
  TrendingUp,
  FileText,
  Users,
  Settings,
  ChevronRight,
  Loader2
} from "lucide-react";
import logo from "@/assets/logo.png";

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, profile, primaryRole, isLoading, signOut, hasRole } = useAuth();
  const { showOnboarding, completeOnboarding } = useOnboarding(user?.id);

  useEffect(() => {
    if (!isLoading && !user) {
      navigate("/auth");
    } else if (!isLoading && user && primaryRole) {
      // Redirect to role-specific dashboard
      if (primaryRole === "tutor") {
        navigate("/tutor/dashboard", { replace: true });
      } else if (primaryRole === "student") {
        navigate("/student/dashboard", { replace: true });
      }
      // Admin stays on this page
    }
  }, [user, isLoading, primaryRole, navigate]);

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  if (isLoading || (primaryRole && primaryRole !== "admin")) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  const getRoleIcon = () => {
    switch (primaryRole) {
      case "admin":
        return <Shield className="w-5 h-5" />;
      case "tutor":
        return <GraduationCap className="w-5 h-5" />;
      default:
        return <User className="w-5 h-5" />;
    }
  };

  const getRoleColor = () => {
    switch (primaryRole) {
      case "admin":
        return "bg-destructive/10 text-destructive";
      case "tutor":
        return "bg-accent/10 text-accent";
      default:
        return "bg-primary/10 text-primary";
    }
  };

  const studentQuickActions = [
    { icon: Brain, label: "Practice Questions", description: "Start a new practice session", href: "/practice" },
    { icon: Target, label: "CBT Simulation", description: "Take a timed mock exam", href: "/simulation" },
    { icon: TrendingUp, label: "My Progress", description: "View your performance analytics", href: "/progress" },
  ];

  const tutorQuickActions = [
    { icon: FileText, label: "Create Quiz", description: "Upload new quiz content", href: "/tutor/create" },
    { icon: TrendingUp, label: "My Earnings", description: "View revenue dashboard", href: "/tutor/earnings" },
    { icon: Users, label: "Student Stats", description: "See who's using your content", href: "/tutor/stats" },
  ];

  const adminQuickActions = [
    { icon: Users, label: "Manage Users", description: "View and manage all users", href: "/admin/users" },
    { icon: GraduationCap, label: "Tutor Applications", description: "Review pending applications", href: "/admin/applications" },
    { icon: Settings, label: "Platform Settings", description: "Configure platform options", href: "/admin/settings" },
  ];

  const getQuickActions = () => {
    if (hasRole("admin")) return adminQuickActions;
    if (hasRole("tutor")) return tutorQuickActions;
    return studentQuickActions;
  };

  return (
    <>
      <SEO
        title="Dashboard"
        description="Your OverraPrep AI dashboard - access your learning tools and track your progress."
        noindex={true}
        url="https://overraprep.com/dashboard"
      />
      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="bg-card border-b border-border sticky top-0 z-50" role="banner">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center group">
              <img 
                src={logo} 
                alt="OverraPrep AI FUTA" 
                className="h-10 w-auto object-contain"
              />
            </Link>

            <div className="flex items-center gap-4">
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${getRoleColor()}`}>
                {getRoleIcon()}
                <span className="text-sm font-medium capitalize">{primaryRole}</span>
              </div>
              
              <Button variant="ghost" size="sm" onClick={handleSignOut}>
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="font-display text-3xl font-bold text-foreground mb-2">
            Welcome back, {profile?.full_name || "there"}! 👋
          </h1>
          <p className="text-muted-foreground">
            {primaryRole === "admin" && "Manage the platform and review tutor applications."}
            {primaryRole === "tutor" && "Create content and track your earnings."}
            {primaryRole === "student" && "Ready to ace your exams? Let's practice!"}
          </p>
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <h2 className="font-display text-xl font-bold text-foreground mb-4">Quick Actions</h2>
          <div className="grid md:grid-cols-3 gap-4">
            {getQuickActions().map((action, index) => {
              const Icon = action.icon;
              return (
                <button
                  key={index}
                  onClick={() => navigate(action.href)}
                  className="bg-card rounded-xl border border-border p-6 text-left hover:shadow-lg hover:border-primary/30 transition-all duration-300 group"
                >
                  <div className="flex items-start justify-between">
                    <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                      <Icon className="w-6 h-6 text-primary" />
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                  </div>
                  <h3 className="font-display font-semibold text-foreground mb-1">
                    {action.label}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {action.description}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Role-specific content */}
        {primaryRole === "student" && (
          <div className="bg-gradient-card rounded-2xl border border-border p-6">
            <div className="flex items-center gap-3 mb-4">
              <GraduationCap className="w-6 h-6 text-accent" />
              <h2 className="font-display text-xl font-bold text-foreground">
                Want to become a Tutor?
              </h2>
            </div>
            <p className="text-muted-foreground mb-4">
              Share your knowledge and earn money by creating quiz content for fellow students.
            </p>
            <Button variant="accent" onClick={() => navigate("/apply-tutor")}>
              Apply as Tutor
            </Button>
          </div>
        )}

        {primaryRole === "admin" && (
          <div className="bg-gradient-card rounded-2xl border border-border p-6">
            <div className="flex items-center gap-3 mb-4">
              <Shield className="w-6 h-6 text-destructive" />
              <h2 className="font-display text-xl font-bold text-foreground">
                Admin Panel
              </h2>
            </div>
            <p className="text-muted-foreground mb-4">
              You have full access to manage users, review applications, and configure platform settings.
            </p>
            <Button variant="default" onClick={() => navigate("/admin/applications")}>
              Review Tutor Applications
            </Button>
          </div>
        )}
      </main>

      <OnboardingDialog
        isOpen={showOnboarding}
        onComplete={completeOnboarding}
        userRole={primaryRole as "student" | "tutor" | "admin"}
        userName={profile?.full_name || undefined}
      />
    </div>
    </>
  );
};

export default Dashboard;
