import { useState } from "react";
import { Link } from "react-router-dom";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Mail, ArrowLeft, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { SEO } from "@/components/seo/SEO";
import logo from "@/assets/logo.png";

const schema = z.object({
  email: z.string().trim().email("Please enter a valid email address").max(255),
});
type FormData = z.infer<typeof schema>;

export default function ForgotPassword() {
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState<string | null>(null);
  const { toast } = useToast();

  const form = useForm<FormData>({ resolver: zodResolver(schema), defaultValues: { email: "" } });

  const onSubmit = async (data: FormData) => {
    setSubmitting(true);
    const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setSubmitting(false);
    if (error) {
      toast({ variant: "destructive", title: "Couldn't send reset link", description: error.message });
      return;
    }
    setSent(data.email);
  };

  return (
    <>
      <SEO title="Reset your password" description="Get a secure password reset link sent to your email." />
      <div className="min-h-screen flex items-center justify-center px-6 py-12 bg-gradient-to-br from-background via-background to-primary/5">
        <div className="w-full max-w-md">
          <Link to="/auth" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors">
            <ArrowLeft className="w-4 h-4 mr-1" /> Back to sign in
          </Link>

          <div className="text-center mb-8">
            <img src={logo} alt="Logo" className="w-14 h-14 mx-auto mb-4 rounded-2xl shadow-elegant" />
            <h1 className="font-display text-3xl font-bold text-foreground">Forgot password?</h1>
            <p className="text-muted-foreground mt-2 text-sm">No worries — we'll email you a secure link.</p>
          </div>

          {sent ? (
            <div className="text-center bg-card rounded-2xl border border-border/60 p-8 shadow-elegant">
              <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-success/15 text-success flex items-center justify-center">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <h2 className="font-display text-xl font-bold mb-2">Check your email</h2>
              <p className="text-sm text-muted-foreground mb-6">
                If <strong className="text-foreground">{sent}</strong> matches an account, a reset link is on the way. The link expires in 1 hour.
              </p>
              <Button asChild variant="outline" className="w-full">
                <Link to="/auth">Back to sign in</Link>
              </Button>
            </div>
          ) : (
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 bg-card rounded-2xl border border-border/60 p-6 shadow-elegant">
              <div className="space-y-2">
                <Label htmlFor="reset-email">Email address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input id="reset-email" type="email" placeholder="you@example.com" className="pl-10 h-12" {...form.register("email")} />
                </div>
                {form.formState.errors.email && (
                  <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>
                )}
              </div>

              <Button variant="hero" size="lg" className="w-full" disabled={submitting}>
                {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Send reset link"}
              </Button>
            </form>
          )}
        </div>
      </div>
    </>
  );
}
