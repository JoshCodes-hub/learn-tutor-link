import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { 
  BookOpen, 
  Sparkles, 
  ArrowLeft, 
  CheckCircle2,
  XCircle,
  Clock,
  User,
  Mail,
  GraduationCap,
  Loader2,
  ChevronDown,
  ChevronUp,
  Phone,
  Building,
  BookMarked,
  FileText
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

interface TutorApplication {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  qualifications: string;
  experience: string;
  courses_to_teach: string;
  bio: string | null;
  status: "pending" | "approved" | "rejected";
  admin_notes: string | null;
  created_at: string;
  profile_image_url: string | null;
}

const TutorApplications = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, isLoading: authLoading, hasRole } = useAuth();
  const [applications, setApplications] = useState<TutorApplication[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [adminNotes, setAdminNotes] = useState<Record<string, string>>({});
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    } else if (!authLoading && user && !hasRole("admin")) {
      navigate("/dashboard");
      toast({
        variant: "destructive",
        title: "Access Denied",
        description: "You don't have permission to access this page.",
      });
    }
  }, [user, authLoading, hasRole, navigate, toast]);

  useEffect(() => {
    const fetchApplications = async () => {
      const { data, error } = await supabase
        .from("tutor_applications")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching applications:", error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load applications.",
        });
      } else {
        setApplications(data as TutorApplication[]);
      }
      setIsLoading(false);
    };

    if (user && hasRole("admin")) {
      fetchApplications();
    }
  }, [user, hasRole, toast]);

  const handleApprove = async (application: TutorApplication) => {
    setProcessingId(application.id);

    // Update application status
    const { error: updateError } = await supabase
      .from("tutor_applications")
      .update({
        status: "approved",
        admin_notes: adminNotes[application.id] || null,
        reviewed_by: user?.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", application.id);

    if (updateError) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to approve application.",
      });
      setProcessingId(null);
      return;
    }

    // Add tutor role to user
    const { error: roleError } = await supabase
      .from("user_roles")
      .insert({
        user_id: application.user_id,
        role: "tutor",
      });

    if (roleError && !roleError.message.includes("duplicate")) {
      console.error("Error adding role:", roleError);
    }

    // Update profile with tutor image if provided
    if (application.profile_image_url) {
      await supabase
        .from("profiles")
        .update({ profile_image_url: application.profile_image_url })
        .eq("id", application.user_id);
    }

    // Update local state
    setApplications(apps =>
      apps.map(app =>
        app.id === application.id
          ? { ...app, status: "approved" as const, admin_notes: adminNotes[application.id] || null }
          : app
      )
    );

    toast({
      title: "Application Approved",
      description: `${application.full_name} is now a tutor.`,
    });
    
    setProcessingId(null);
  };

  const handleReject = async (application: TutorApplication) => {
    if (!adminNotes[application.id]) {
      toast({
        variant: "destructive",
        title: "Notes Required",
        description: "Please provide a reason for rejection.",
      });
      return;
    }

    setProcessingId(application.id);

    const { error } = await supabase
      .from("tutor_applications")
      .update({
        status: "rejected",
        admin_notes: adminNotes[application.id],
        reviewed_by: user?.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", application.id);

    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to reject application.",
      });
    } else {
      setApplications(apps =>
        apps.map(app =>
          app.id === application.id
            ? { ...app, status: "rejected" as const, admin_notes: adminNotes[application.id] }
            : app
        )
      );
      toast({
        title: "Application Rejected",
        description: "The applicant has been notified.",
      });
    }
    
    setProcessingId(null);
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const pendingApplications = applications.filter(a => a.status === "pending");
  const reviewedApplications = applications.filter(a => a.status !== "pending");

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <button
              onClick={() => navigate("/dashboard")}
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              Back to Dashboard
            </button>

            <a href="/" className="flex items-center gap-2 group">
              <div className="relative">
                <div className="w-10 h-10 bg-gradient-primary rounded-xl flex items-center justify-center shadow-md">
                  <BookOpen className="w-5 h-5 text-primary-foreground" />
                </div>
                <Sparkles className="w-4 h-4 text-accent absolute -top-1 -right-1 animate-pulse-subtle" />
              </div>
            </a>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <h1 className="font-display text-3xl font-bold text-foreground mb-2">
            Tutor Applications
          </h1>
          <p className="text-muted-foreground">
            Review and manage tutor applications
          </p>
        </div>

        {/* Pending Applications */}
        <section className="mb-12">
          <h2 className="font-display text-xl font-bold text-foreground mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-accent" />
            Pending Applications ({pendingApplications.length})
          </h2>
          
          {pendingApplications.length === 0 ? (
            <div className="bg-muted/30 rounded-xl p-8 text-center">
              <p className="text-muted-foreground">No pending applications</p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingApplications.map((application) => (
                <div
                  key={application.id}
                  className="bg-card rounded-xl border border-border overflow-hidden"
                >
                  {/* Header */}
                  <button
                    onClick={() => setExpandedId(expandedId === application.id ? null : application.id)}
                    className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <Avatar className="w-14 h-14 border-2 border-primary/20">
                        <AvatarImage src={application.profile_image_url || undefined} alt={application.full_name} />
                        <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                          {getInitials(application.full_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="text-left">
                        <h3 className="font-semibold text-foreground">{application.full_name}</h3>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Mail className="w-4 h-4" />
                          {application.email}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground">
                        {new Date(application.created_at).toLocaleDateString()}
                      </span>
                      {expandedId === application.id ? (
                        <ChevronUp className="w-5 h-5 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-muted-foreground" />
                      )}
                    </div>
                  </button>

                  {/* Expanded Content */}
                  {expandedId === application.id && (
                    <div className="border-t border-border p-6 space-y-5">
                      {/* Profile Image Large View */}
                      {application.profile_image_url && (
                        <div className="flex justify-center mb-4">
                          <img 
                            src={application.profile_image_url} 
                            alt={application.full_name}
                            className="w-32 h-32 rounded-full object-cover border-4 border-primary/20 shadow-lg"
                          />
                        </div>
                      )}

                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="bg-muted/30 rounded-lg p-4">
                          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-2">
                            <GraduationCap className="w-4 h-4" />
                            Qualifications
                          </div>
                          <p className="text-foreground text-sm whitespace-pre-wrap">{application.qualifications}</p>
                        </div>
                        <div className="bg-muted/30 rounded-lg p-4">
                          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-2">
                            <FileText className="w-4 h-4" />
                            Experience
                          </div>
                          <p className="text-foreground text-sm whitespace-pre-wrap">{application.experience}</p>
                        </div>
                      </div>
                      
                      <div className="bg-muted/30 rounded-lg p-4">
                        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-2">
                          <BookMarked className="w-4 h-4" />
                          Courses to Teach
                        </div>
                        <p className="text-foreground text-sm">{application.courses_to_teach}</p>
                      </div>

                      {application.bio && (
                        <div className="bg-muted/30 rounded-lg p-4">
                          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-2">
                            <User className="w-4 h-4" />
                            Bio
                          </div>
                          <p className="text-foreground text-sm">{application.bio}</p>
                        </div>
                      )}

                      <div>
                        <h4 className="text-sm font-medium text-muted-foreground mb-2">Admin Notes</h4>
                        <Textarea
                          placeholder="Add notes (required for rejection, optional for approval)"
                          value={adminNotes[application.id] || ""}
                          onChange={(e) => setAdminNotes({
                            ...adminNotes,
                            [application.id]: e.target.value
                          })}
                          rows={2}
                        />
                      </div>

                      <div className="flex gap-3 pt-2">
                        <Button
                          variant="default"
                          onClick={() => handleApprove(application)}
                          disabled={processingId === application.id}
                          className="flex-1"
                        >
                          {processingId === application.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <>
                              <CheckCircle2 className="w-4 h-4 mr-2" />
                              Approve
                            </>
                          )}
                        </Button>
                        <Button
                          variant="destructive"
                          onClick={() => handleReject(application)}
                          disabled={processingId === application.id}
                          className="flex-1"
                        >
                          <XCircle className="w-4 h-4 mr-2" />
                          Reject
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Reviewed Applications */}
        <section>
          <h2 className="font-display text-xl font-bold text-foreground mb-4 flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-primary" />
            Reviewed Applications ({reviewedApplications.length})
          </h2>

          {reviewedApplications.length === 0 ? (
            <div className="bg-muted/30 rounded-xl p-8 text-center">
              <p className="text-muted-foreground">No reviewed applications yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {reviewedApplications.map((application) => (
                <div
                  key={application.id}
                  className="bg-card rounded-xl border border-border p-4 flex items-center justify-between"
                >
                  <div className="flex items-center gap-4">
                    <Avatar className="w-12 h-12">
                      <AvatarImage src={application.profile_image_url || undefined} alt={application.full_name} />
                      <AvatarFallback className="bg-muted">
                        {getInitials(application.full_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-medium text-foreground">{application.full_name}</h3>
                      <p className="text-sm text-muted-foreground">{application.email}</p>
                    </div>
                  </div>
                  <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${
                    application.status === "approved" 
                      ? "bg-success/10 text-success"
                      : "bg-destructive/10 text-destructive"
                  }`}>
                    {application.status === "approved" ? (
                      <CheckCircle2 className="w-4 h-4" />
                    ) : (
                      <XCircle className="w-4 h-4" />
                    )}
                    {application.status === "approved" ? "Approved" : "Rejected"}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

export default TutorApplications;