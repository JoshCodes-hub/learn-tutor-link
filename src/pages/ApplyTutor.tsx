import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { 
  ArrowLeft, 
  GraduationCap,
  Loader2,
  CheckCircle2,
  Clock,
  XCircle,
  Upload,
  User,
  Camera
} from "lucide-react";
import logo from "@/assets/logo.png";
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
  phone: z.string().min(10, "Valid phone number is required").max(15),
  department: z.string().min(2, "Department is required").max(100),
  level: z.string().min(1, "Level is required"),
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
  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [profileImagePreview, setProfileImagePreview] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<ApplicationFormData>({
    resolver: zodResolver(applicationSchema),
    defaultValues: {
      fullName: profile?.full_name || "",
      email: profile?.email || "",
      phone: "",
      department: profile?.department || "",
      level: "",
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
      form.setValue("department", profile.department || "");
    }
  }, [profile, form]);

  useEffect(() => {
    const fetchExistingApplication = async () => {
      if (!user) return;
      
      const { data, error } = await supabase
        .from("tutor_applications")
        .select("status, admin_notes, profile_image_url")
        .eq("user_id", user.id)
        .maybeSingle();

      if (data) {
        setExistingApplication({
          status: data.status as ApplicationStatus,
          admin_notes: data.admin_notes,
        });
        if (data.profile_image_url) {
          setProfileImagePreview(data.profile_image_url);
        }
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

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({
          variant: "destructive",
          title: "File too large",
          description: "Please select an image under 5MB",
        });
        return;
      }
      
      if (!file.type.startsWith("image/")) {
        toast({
          variant: "destructive",
          title: "Invalid file type",
          description: "Please select an image file",
        });
        return;
      }
      
      setProfileImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadProfileImage = async (): Promise<string | null> => {
    if (!profileImage || !user) return null;
    
    setIsUploadingImage(true);
    const fileExt = profileImage.name.split('.').pop();
    const fileName = `${user.id}/${Date.now()}.${fileExt}`;
    
    const { error: uploadError } = await supabase.storage
      .from('tutor-profiles')
      .upload(fileName, profileImage);
    
    if (uploadError) {
      console.error("Upload error:", uploadError);
      toast({
        variant: "destructive",
        title: "Image upload failed",
        description: uploadError.message,
      });
      setIsUploadingImage(false);
      return null;
    }
    
    const { data: { publicUrl } } = supabase.storage
      .from('tutor-profiles')
      .getPublicUrl(fileName);
    
    setIsUploadingImage(false);
    return publicUrl;
  };

  const handleSubmit = async (data: ApplicationFormData) => {
    if (!user) return;

    setIsSubmitting(true);
    
    // Upload profile image first
    let profileImageUrl = null;
    if (profileImage) {
      profileImageUrl = await uploadProfileImage();
    }
    
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
        profile_image_url: profileImageUrl,
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
          
          <a href="/" className="flex items-center group">
            <img 
              src={logo} 
              alt="OverraPrep AI FUTA" 
              className="h-10 w-auto object-contain"
            />
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
              {/* Profile Image Upload */}
              <div className="flex flex-col items-center mb-6">
                <Label className="mb-3 text-center">Profile Photo</Label>
                <div 
                  className="relative w-28 h-28 rounded-full overflow-hidden bg-muted border-2 border-dashed border-border hover:border-primary transition-colors cursor-pointer group"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {profileImagePreview ? (
                    <img 
                      src={profileImagePreview} 
                      alt="Profile preview" 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground">
                      <User className="w-10 h-10 mb-1" />
                      <span className="text-xs">Add Photo</span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Camera className="w-6 h-6 text-white" />
                  </div>
                </div>
                <input 
                  ref={fileInputRef}
                  type="file" 
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />
                <p className="text-xs text-muted-foreground mt-2">Max 5MB, JPG/PNG</p>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name *</Label>
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
                  <Label htmlFor="email">Email *</Label>
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

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number *</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="08012345678"
                    {...form.register("phone")}
                  />
                  {form.formState.errors.phone && (
                    <p className="text-sm text-destructive">{form.formState.errors.phone.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="department">Department *</Label>
                  <Input
                    id="department"
                    placeholder="e.g. Computer Science"
                    {...form.register("department")}
                  />
                  {form.formState.errors.department && (
                    <p className="text-sm text-destructive">{form.formState.errors.department.message}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="level">Level/Year of Study *</Label>
                <Input
                  id="level"
                  placeholder="e.g. 400 Level, Graduate, Postgraduate"
                  {...form.register("level")}
                />
                {form.formState.errors.level && (
                  <p className="text-sm text-destructive">{form.formState.errors.level.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="qualifications">Qualifications *</Label>
                <Textarea
                  id="qualifications"
                  placeholder="Describe your academic qualifications, certifications, awards, etc."
                  rows={3}
                  {...form.register("qualifications")}
                />
                {form.formState.errors.qualifications && (
                  <p className="text-sm text-destructive">{form.formState.errors.qualifications.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="experience">Teaching/Tutoring Experience *</Label>
                <Textarea
                  id="experience"
                  placeholder="Describe your teaching, tutoring, or mentoring experience. Include any relevant workshops, seminars, or classes you've conducted."
                  rows={3}
                  {...form.register("experience")}
                />
                {form.formState.errors.experience && (
                  <p className="text-sm text-destructive">{form.formState.errors.experience.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="coursesToTeach">Courses You Want to Teach *</Label>
                <Textarea
                  id="coursesToTeach"
                  placeholder="List the courses you'd like to create content for (e.g., PHY 101, MTH 201, CSC 301)"
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
                  placeholder="Tell students about yourself - your teaching style, areas of expertise, and what makes you a great tutor"
                  rows={3}
                  {...form.register("bio")}
                />
              </div>

              <Button 
                variant="accent" 
                size="lg" 
                className="w-full" 
                disabled={isSubmitting || isUploadingImage}
              >
                {isSubmitting || isUploadingImage ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                    {isUploadingImage ? "Uploading Image..." : "Submitting..."}
                  </>
                ) : (
                  <>
                    <Upload className="w-5 h-5 mr-2" />
                    Submit Application
                  </>
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