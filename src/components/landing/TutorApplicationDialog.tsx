import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { 
  GraduationCap,
  Loader2,
  CheckCircle2,
  Clock,
  XCircle,
  Upload,
  User,
  Camera
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { ScrollArea } from "@/components/ui/scroll-area";

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

interface TutorApplicationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const TutorApplicationDialog = ({ open, onOpenChange }: TutorApplicationDialogProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, profile, isLoading: authLoading, hasRole } = useAuth();
  const [existingApplication, setExistingApplication] = useState<{
    status: ApplicationStatus;
    admin_notes: string | null;
  } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingApplication, setIsLoadingApplication] = useState(false);
  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [profileImagePreview, setProfileImagePreview] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<ApplicationFormData>({
    resolver: zodResolver(applicationSchema),
    defaultValues: {
      fullName: "",
      email: "",
      phone: "",
      department: "",
      level: "",
      qualifications: "",
      experience: "",
      coursesToTeach: "",
      bio: "",
    },
  });

  // Redirect to auth if not logged in
  useEffect(() => {
    if (open && !authLoading && !user) {
      onOpenChange(false);
      navigate("/auth");
    }
  }, [user, authLoading, open, navigate, onOpenChange]);

  // Pre-fill form with profile data
  useEffect(() => {
    if (profile) {
      form.setValue("fullName", profile.full_name || "");
      form.setValue("email", profile.email || "");
      form.setValue("department", profile.department || "");
    }
  }, [profile, form]);

  // Fetch existing application when dialog opens
  useEffect(() => {
    const fetchExistingApplication = async () => {
      if (!user || !open) return;
      
      setIsLoadingApplication(true);
      const { data } = await supabase
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

    if (user && open) {
      fetchExistingApplication();
    }
  }, [user, open]);

  // If already a tutor, redirect to dashboard
  useEffect(() => {
    if (open && hasRole("tutor")) {
      onOpenChange(false);
      navigate("/dashboard");
    }
  }, [hasRole, open, navigate, onOpenChange]);

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
        <h2 className="font-display text-xl font-bold text-foreground mb-2">
          {config.title}
        </h2>
        <p className="text-muted-foreground max-w-md mx-auto mb-6">
          {config.description}
        </p>
        <Button variant="default" onClick={() => { onOpenChange(false); navigate("/dashboard"); }}>
          Go to Dashboard
        </Button>
      </div>
    );
  };

  const isLoading = authLoading || isLoadingApplication;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] p-0">
        <DialogHeader className="p-6 pb-0">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-accent/10 rounded-xl flex items-center justify-center">
              <GraduationCap className="w-6 h-6 text-accent" />
            </div>
            <div>
              <DialogTitle className="font-display text-xl font-bold">
                Become a Tutor
              </DialogTitle>
              <p className="text-sm text-muted-foreground">
                Share your knowledge and earn money
              </p>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-100px)]">
          <div className="p-6 pt-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : existingApplication ? (
              renderApplicationStatus()
            ) : (
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-5">
                {/* Profile Image Upload */}
                <div className="flex flex-col items-center mb-4">
                  <Label className="mb-2 text-center text-sm">Profile Photo</Label>
                  <div 
                    className="relative w-24 h-24 rounded-full overflow-hidden bg-muted border-2 border-dashed border-border hover:border-primary transition-colors cursor-pointer group"
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
                        <User className="w-8 h-8 mb-1" />
                        <span className="text-xs">Add Photo</span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Camera className="w-5 h-5 text-white" />
                    </div>
                  </div>
                  <input 
                    ref={fileInputRef}
                    type="file" 
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Max 5MB, JPG/PNG</p>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="fullName" className="text-sm">Full Name *</Label>
                    <Input
                      id="fullName"
                      placeholder="John Doe"
                      {...form.register("fullName")}
                    />
                    {form.formState.errors.fullName && (
                      <p className="text-xs text-destructive">{form.formState.errors.fullName.message}</p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="email" className="text-sm">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      {...form.register("email")}
                    />
                    {form.formState.errors.email && (
                      <p className="text-xs text-destructive">{form.formState.errors.email.message}</p>
                    )}
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="phone" className="text-sm">Phone Number *</Label>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="08012345678"
                      {...form.register("phone")}
                    />
                    {form.formState.errors.phone && (
                      <p className="text-xs text-destructive">{form.formState.errors.phone.message}</p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="department" className="text-sm">Department *</Label>
                    <Input
                      id="department"
                      placeholder="e.g. Computer Science"
                      {...form.register("department")}
                    />
                    {form.formState.errors.department && (
                      <p className="text-xs text-destructive">{form.formState.errors.department.message}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="level" className="text-sm">Level/Year of Study *</Label>
                  <Input
                    id="level"
                    placeholder="e.g. 400 Level, Graduate, Postgraduate"
                    {...form.register("level")}
                  />
                  {form.formState.errors.level && (
                    <p className="text-xs text-destructive">{form.formState.errors.level.message}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="qualifications" className="text-sm">Qualifications *</Label>
                  <Textarea
                    id="qualifications"
                    placeholder="Describe your academic qualifications, certifications, awards, etc."
                    rows={2}
                    {...form.register("qualifications")}
                  />
                  {form.formState.errors.qualifications && (
                    <p className="text-xs text-destructive">{form.formState.errors.qualifications.message}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="experience" className="text-sm">Teaching/Tutoring Experience *</Label>
                  <Textarea
                    id="experience"
                    placeholder="Describe your teaching, tutoring, or mentoring experience."
                    rows={2}
                    {...form.register("experience")}
                  />
                  {form.formState.errors.experience && (
                    <p className="text-xs text-destructive">{form.formState.errors.experience.message}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="coursesToTeach" className="text-sm">Courses You Want to Teach *</Label>
                  <Textarea
                    id="coursesToTeach"
                    placeholder="List the courses (e.g., PHY 101, MTH 201, CSC 301)"
                    rows={2}
                    {...form.register("coursesToTeach")}
                  />
                  {form.formState.errors.coursesToTeach && (
                    <p className="text-xs text-destructive">{form.formState.errors.coursesToTeach.message}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="bio" className="text-sm">Short Bio (Optional)</Label>
                  <Textarea
                    id="bio"
                    placeholder="Tell students about yourself and your teaching style"
                    rows={2}
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
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default TutorApplicationDialog;
