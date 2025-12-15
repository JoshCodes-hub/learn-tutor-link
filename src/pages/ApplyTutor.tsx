import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { 
  BookOpen, 
  Sparkles, 
  ArrowLeft, 
  GraduationCap,
  Loader2,
  CheckCircle2,
  Clock,
  XCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

const applicationSchema = z.object({
  fullName: z.string().min(2, "Full name is required").max(100),
  email: z.string().email("Valid email is required"),
  qualifications: z.string().min(20, "Please describe your qualifications (min 20 characters)").max(1000),
  experience: z.string().min(20, "Please describe your experience (min 20 characters)").max(1000),
  coursesToTeach: z.string().min(5, "Please list the courses you want to teach").max(500),
  bio: z.string().max(500).optional(),
});

type ApplicationFormData = z.infer<typeof applicationSchema>;

type ApplicationStatus = "pending" | "approved" | "rejected" | null;

const ApplyTutor = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, profile, isLoading: authLoading, hasRole } = useAuth();
  const [existingApplication, setExistingApplication] = useState<{
    status: ApplicationStatus;
    admin_notes: string | null;
  } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingApplication, setIsLoadingApplication] = useState(true);

  const form = useForm<ApplicationFormData>({
    resolver: zodResolver(applicationSchema),
    defaultValues: {
      fullName: profile?.full_name || "",
      email: profile?.email || "",
      qualifications: "",
      experience: "",
      coursesToTeach: "",
      bio: "",
    },
  });

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (profile) {
      form.setValue("fullName", profile.full_name || "");
      form.setValue("email", profile.email || "");
    }
  }, [profile, form]);

  useEffect(() => {
    const fetchExistingApplication = async () => {
      if (!user) return;
      
      const { data, error } = await supabase
        .from("tutor_applications")
        .select("status, admin_notes")
        .eq("user_id", user.id)
        .maybeSingle();

      if (data) {
        setExistingApplication({
          status: data.status as ApplicationStatus,
          admin_notes: data.admin_notes,
        });
      }
      setIsLoadingApplication(false);
    };

    if (user) {
      fetchExistingApplication();
    }
  }, [user]);

  // If already a tutor, redirect
  useEffect(() => {
    if (hasRole("tutor")) {
      navigate("/dashboard");
    }
  }, [hasRole, navigate]);

  const handleSubmit = async (data: ApplicationFormData) => {
    if (!user) return;

    setIsSubmitting(true);
    
    const { error } = await supabase
      .from("tutor_applications")
      .insert({
        user_id: user.id,
        full_name: data.fullName,
        email: data.email,
        qualifications: data.qualifications,
        experience: data.experience,
        courses_to_teach: data.coursesToTeach,
        bio: data.bio || null,
      });

    if (error) {
      toast({
        variant: "destructive",
        title: "Application failed",
        description: error.message,
      });
    } else {
      toast({
        title: "Application submitted!",
        description: "We'll review your application and get back to you soon.",
      });
      setExistingApplication({ status: "pending", admin_notes: null });
    }
    
    setIsSubmitting(false);
  };

  if (authLoading || isLoadingApplication) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const renderApplicationStatus = () => {
    if (!existingApplication) return null;

    const statusConfig = {
      pending: {
        icon: Clock,
        color: "text-accent",
        bgColor: "bg-accent/10",
        title: "Application Pending",
        description: "Your application is being reviewed. We'll notify you once a decision is made.",
      },
      approved: {
        icon: CheckCircle2,
        color: "text-success",
        bgColor: "bg-success/10",
        title: "Application Approved!",
        description: "Congratulations! You're now a tutor. Start creating content from your dashboard.",
      },
      rejected: {
        icon: XCircle,
        color: "text-destructive",
        bgColor: "bg-destructive/10",
        title: "Application Not Approved",
        description: existingApplication.admin_notes || "Unfortunately, your application wasn't approved at this time.",
      },
    };

    const config = statusConfig[existingApplication.status as keyof typeof statusConfig];
    if (!config) return null;

    const Icon = config.icon;

    return (
      <div className={`${config.bgColor} rounded-2xl p-8 text-center`}>
        <div className={`w-16 h-16 mx-auto mb-4 rounded-full ${config.bgColor} flex items-center justify-center`}>
          <Icon className={`w-8 h-8 ${config.color}`} />
        </div>
        <h2 className="font-display text-2xl font-bold text-foreground mb-2">
          {config.title}
        </h2>
        <p className="text-muted-foreground max-w-md mx-auto mb-6">
          {config.description}
        </p>
        <Button variant="default" onClick={() => navigate("/dashboard")}>
          Back to Dashboard
        </Button>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-hero py-8">
      <div className="container mx-auto px-4 max-w-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
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

        {existingApplication ? (
          renderApplicationStatus()
        ) : (
          <div className="bg-card rounded-2xl border border-border shadow-xl p-8">
            {/* Title */}
            <div className="text-center mb-8">
              <div className="w-16 h-16 mx-auto mb-4 bg-accent/10 rounded-2xl flex items-center justify-center">
                <GraduationCap className="w-8 h-8 text-accent" />
              </div>
              <h1 className="font-display text-2xl font-bold text-foreground mb-2">
                Become a Tutor
              </h1>
              <p className="text-muted-foreground">
                Share your knowledge and earn money by creating quiz content
              </p>
            </div>

            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input
                    id="fullName"
                    placeholder="John Doe"
                    {...form.register("fullName")}
                  />
                  {form.formState.errors.fullName && (
                    <p className="text-sm text-destructive">{form.formState.errors.fullName.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    {...form.register("email")}
                  />
                  {form.formState.errors.email && (
                    <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="qualifications">Qualifications</Label>
                <Textarea
                  id="qualifications"
                  placeholder="Describe your academic qualifications (degrees, certifications, etc.)"
                  rows={3}
                  {...form.register("qualifications")}
                />
                {form.formState.errors.qualifications && (
                  <p className="text-sm text-destructive">{form.formState.errors.qualifications.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="experience">Teaching Experience</Label>
                <Textarea
                  id="experience"
                  placeholder="Describe your teaching or tutoring experience"
                  rows={3}
                  {...form.register("experience")}
                />
                {form.formState.errors.experience && (
                  <p className="text-sm text-destructive">{form.formState.errors.experience.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="coursesToTeach">Courses You Want to Teach</Label>
                <Textarea
                  id="coursesToTeach"
                  placeholder="List the courses you'd like to create content for (e.g., PHY 101, MTH 201)"
                  rows={2}
                  {...form.register("coursesToTeach")}
                />
                {form.formState.errors.coursesToTeach && (
                  <p className="text-sm text-destructive">{form.formState.errors.coursesToTeach.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio">Short Bio (Optional)</Label>
                <Textarea
                  id="bio"
                  placeholder="Tell students a bit about yourself"
                  rows={2}
                  {...form.register("bio")}
                />
              </div>

              <Button variant="accent" size="lg" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  "Submit Application"
                )}
              </Button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default ApplyTutor;
