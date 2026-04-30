import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Mail, Lock, User, ArrowRight, Loader2, Gift, GraduationCap, Phone, MapPin, BookOpen, IdCard } from "lucide-react";
import logo from "@/assets/logo.png";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { SEO } from "@/components/seo/SEO";
import { supabase } from "@/integrations/supabase/client";

const NIGERIAN_STATES = [
  "Abia","Adamawa","Akwa Ibom","Anambra","Bauchi","Bayelsa","Benue","Borno","Cross River","Delta",
  "Ebonyi","Edo","Ekiti","Enugu","FCT","Gombe","Imo","Jigawa","Kaduna","Kano","Katsina","Kebbi",
  "Kogi","Kwara","Lagos","Nasarawa","Niger","Ogun","Ondo","Osun","Oyo","Plateau","Rivers","Sokoto",
  "Taraba","Yobe","Zamfara",
];

const signInSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const signUpSchema = z.object({
  fullName: z.string().trim().min(2, "Full name must be at least 2 characters").max(100, "Full name is too long"),
  email: z.string().trim().email("Please enter a valid email address").max(255),
  password: z.string().min(6, "Password must be at least 6 characters").max(72),
  confirmPassword: z.string(),
  academicPath: z.enum(["secondary", "jamb", "university"], { required_error: "Select your academic path" }),
  level: z.string().trim().min(1, "Level is required").max(40),
  department: z.string().trim().min(2, "Department is required").max(120),
  school: z.string().trim().min(2, "School is required").max(120),
  phone: z.string().trim().min(7, "Enter a valid phone number").max(20),
  matricNo: z.string().trim().min(2, "Matric number is required").max(40),
  state: z.string().trim().min(2, "Select state of origin").max(60),
  referralCode: z.string().optional(),
}).refine((d) => d.password === d.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type SignInFormData = z.infer<typeof signInSchema>;
type SignUpFormData = z.infer<typeof signUpSchema>;

const INTENT_LABELS: Record<string, string> = {
  student: "Student",
  tutor: "Tutor",
  parent: "Parent",
  school_owner: "School Owner",
};

const Auth = () => {
  const [searchParams] = useSearchParams();
  const referralCodeFromUrl = searchParams.get("ref") || "";
  const modeFromUrl = searchParams.get("mode");
  const intent = searchParams.get("intent") || "";
  const redirect = searchParams.get("redirect") || "";
  const [isSignUp, setIsSignUp] = useState(modeFromUrl === "signup" || !!referralCodeFromUrl || !!intent);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user, signIn, signUp } = useAuth();

  const postAuthDestination = (justSignedUp = false) => {
    if (redirect) return redirect;
    if (intent === "tutor") return "/apply-tutor";
    if (intent === "school_owner") return "/school/register";
    if (intent === "parent") return "/parent/dashboard";
    // New students go through the onboarding wizard before the dashboard
    if (justSignedUp) return "/onboarding/match";
    return "/dashboard";
  };

  useEffect(() => {
    if (user) {
      navigate(postAuthDestination());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, navigate]);

  const signInForm = useForm<SignInFormData>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: "", password: "" },
  });

  const signUpForm = useForm<SignUpFormData>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { fullName: "", email: "", password: "", confirmPassword: "", referralCode: referralCodeFromUrl },
  });

  const handleSignIn = async (data: SignInFormData) => {
    setIsSubmitting(true);
    const { error } = await signIn(data.email, data.password);
    
    if (error) {
      toast({
        variant: "destructive",
        title: "Sign in failed",
        description: error.message === "Invalid login credentials" 
          ? "Invalid email or password. Please try again."
          : error.message,
      });
    } else {
      toast({
        title: "Welcome back!",
        description: "You have successfully signed in.",
      });
      navigate(postAuthDestination());
    }
    setIsSubmitting(false);
  };

  const handleSignUp = async (data: SignUpFormData) => {
    setIsSubmitting(true);
    const { error } = await signUp(data.email, data.password, data.fullName, data.referralCode);
    
    if (error) {
      let message = error.message;
      if (error.message.includes("already registered")) {
        message = "This email is already registered. Please sign in instead.";
      }
      toast({
        variant: "destructive",
        title: "Sign up failed",
        description: message,
      });
    } else {
      const welcomeMsg = data.referralCode 
        ? "Welcome to OverraPrep AI! Complete your first quiz to earn bonus tokens."
        : "Welcome to OverraPrep AI. You can now start practicing.";
      toast({
        title: "Account created!",
        description: welcomeMsg,
      });
      navigate(postAuthDestination(true));
    }
    setIsSubmitting(false);
  };

  return (
    <>
      <SEO
        title={isSignUp ? "Sign Up" : "Sign In"}
        description="Sign in or create an account to access AI-powered CBT exam preparation for FUTA students."
        noindex={true}
        url="https://overraprep.com/auth"
      />
      <main className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden" role="main">
        {/* Premium gold ambient glow */}
        <div className="pointer-events-none absolute -top-32 -left-32 w-96 h-96 rounded-full bg-primary/20 blur-3xl" aria-hidden />
        <div className="pointer-events-none absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-primary/10 blur-3xl" aria-hidden />

        <article className="w-full max-w-md relative z-10">
        {/* Logo */}
        <div className="text-center mb-8">
          <a href="/" className="inline-flex items-center group">
            <img
              src={logo}
              alt="OverraPrep AI"
              className="h-14 w-auto object-contain drop-shadow-[0_4px_20px_hsl(var(--primary)/0.35)]"
            />
          </a>
          <p className="mt-3 text-xs uppercase tracking-[0.2em] text-muted-foreground font-semibold">
            Read with Ease
          </p>
        </div>

        {isSignUp && intent && INTENT_LABELS[intent] && (
          <div className="mb-4 flex items-center justify-center gap-2 text-xs">
            <span className="px-3 py-1.5 rounded-full bg-primary/10 text-primary font-semibold">
              Signing up as {INTENT_LABELS[intent]}
            </span>
            <button
              type="button"
              onClick={() => navigate(intent === "school_owner" ? "/school/intro" : "/start/persona")}
              className="text-muted-foreground hover:text-foreground underline"
            >
              change
            </button>
          </div>
        )}

        {/* Auth Card */}
        <div className="bg-card rounded-3xl border border-primary/15 shadow-[0_20px_60px_-15px_hsl(var(--primary)/0.25)] p-8 backdrop-blur-sm">
          {/* Tab Switcher */}
          <div className="flex mb-8 bg-muted rounded-lg p-1">
            <button
              onClick={() => setIsSignUp(false)}
              className={`flex-1 py-2.5 text-sm font-semibold rounded-md transition-all duration-200 ${
                !isSignUp
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => setIsSignUp(true)}
              className={`flex-1 py-2.5 text-sm font-semibold rounded-md transition-all duration-200 ${
                isSignUp
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Sign Up
            </button>
          </div>

          {!isSignUp ? (
            /* Sign In Form */
            <form onSubmit={signInForm.handleSubmit(handleSignIn)} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="signin-email" className="text-foreground font-medium">
                  Email
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="signin-email"
                    type="email"
                    placeholder="you@example.com"
                    className="pl-10 h-12"
                    {...signInForm.register("email")}
                  />
                </div>
                {signInForm.formState.errors.email && (
                  <p className="text-sm text-destructive">{signInForm.formState.errors.email.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="signin-password" className="text-foreground font-medium">
                  Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="signin-password"
                    type="password"
                    placeholder="••••••••"
                    className="pl-10 h-12"
                    {...signInForm.register("password")}
                  />
                </div>
                {signInForm.formState.errors.password && (
                  <p className="text-sm text-destructive">{signInForm.formState.errors.password.message}</p>
                )}
              </div>

              <div className="flex justify-end -mt-2">
                <a href="/forgot-password" className="text-xs font-semibold text-primary hover:underline">
                  Forgot password?
                </a>
              </div>

              <Button variant="hero" size="lg" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    Sign In
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </Button>
            </form>
          ) : (
            /* Sign Up Form */
            <form onSubmit={signUpForm.handleSubmit(handleSignUp)} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="signup-name" className="text-foreground font-medium">
                  Full Name
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="signup-name"
                    type="text"
                    placeholder="John Doe"
                    className="pl-10 h-12"
                    {...signUpForm.register("fullName")}
                  />
                </div>
                {signUpForm.formState.errors.fullName && (
                  <p className="text-sm text-destructive">{signUpForm.formState.errors.fullName.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="signup-email" className="text-foreground font-medium">
                  Email
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="you@example.com"
                    className="pl-10 h-12"
                    {...signUpForm.register("email")}
                  />
                </div>
                {signUpForm.formState.errors.email && (
                  <p className="text-sm text-destructive">{signUpForm.formState.errors.email.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="signup-password" className="text-foreground font-medium">
                  Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="signup-password"
                    type="password"
                    placeholder="••••••••"
                    className="pl-10 h-12"
                    {...signUpForm.register("password")}
                  />
                </div>
                {signUpForm.formState.errors.password && (
                  <p className="text-sm text-destructive">{signUpForm.formState.errors.password.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="signup-confirm" className="text-foreground font-medium">
                  Confirm Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="signup-confirm"
                    type="password"
                    placeholder="••••••••"
                    className="pl-10 h-12"
                    {...signUpForm.register("confirmPassword")}
                  />
                </div>
                {signUpForm.formState.errors.confirmPassword && (
                  <p className="text-sm text-destructive">{signUpForm.formState.errors.confirmPassword.message}</p>
                )}
              </div>

              {/* Referral Code Section - Highlighted */}
              <div className="relative p-4 bg-gradient-to-r from-primary/5 via-accent/5 to-primary/5 rounded-xl border border-primary/20">
                <div className="absolute -top-3 left-4 bg-card px-2">
                  <span className="text-xs font-semibold text-primary flex items-center gap-1">
                    <Gift className="w-3 h-3" />
                    BONUS TOKENS
                  </span>
                </div>
                <div className="space-y-2 mt-1">
                  <Label htmlFor="signup-referral" className="text-foreground font-medium">
                    Got a referral code from a friend?
                  </Label>
                  <Input
                    id="signup-referral"
                    type="text"
                    placeholder="Paste code here (e.g., REF-ABC123)"
                    className="h-12 font-mono uppercase bg-card border-primary/30 focus:border-primary"
                    {...signUpForm.register("referralCode")}
                  />
                  <p className="text-xs text-muted-foreground">
                    {referralCodeFromUrl ? (
                      <span className="text-primary font-medium">🎁 Referral code applied! Complete your first quiz to earn bonus tokens.</span>
                    ) : (
                      "Enter a friend's referral code to earn bonus tokens after your first quiz!"
                    )}
                  </p>
                </div>
              </div>

              <Button variant="hero" size="lg" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    Create Account
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </Button>

              <p className="text-xs text-center text-muted-foreground">
                By signing up, you agree to our Terms of Service and Privacy Policy
              </p>
            </form>
          )}
        </div>

        <p className="text-center text-sm text-muted-foreground mt-6">
          <a href="/" className="hover:text-foreground transition-colors">
            ← Back to Home
          </a>
        </p>
      </article>
    </main>
    </>
  );
};

export default Auth;
