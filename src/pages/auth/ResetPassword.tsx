import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Lock, Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { SEO } from "@/components/seo/SEO";
import logo from "@/assets/logo.png";

const schema = z.object({
  password: z.string().min(8, "Password must be at least 8 characters").max(72),
  confirm: z.string(),
}).refine((d) => d.password === d.confirm, { message: "Passwords don't match", path: ["confirm"] });
type FormData = z.infer<typeof schema>;

export default function ResetPassword() {
  const [ready, setReady] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [invalid, setInvalid] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  // Supabase puts the recovery token in the URL hash and creates a session
  // automatically via detectSessionInUrl. We just confirm a session exists.
  useEffect(() => {
    let active = true;
    (async () => {
      // Give detectSessionInUrl a tick to process the hash.
      await new Promise((r) => setTimeout(r, 50));
      const { data } = await supabase.auth.getSession();
      if (!active) return;
      const isRecovery = window.location.hash.includes("type=recovery") || !!data.session;
      if (!isRecovery) {
        setInvalid(true);
      }
      setReady(true);
    })();
    return () => { active = false; };
  }, []);

  const form = useForm<FormData>({ resolver: zodResolver(schema), defaultValues: { password: "", confirm: "" } });

  const onSubmit = async (data: FormData) => {
    setSubmitting(true);
    const { error } = await supabase.auth.updateUser({ password: data.password });
    setSubmitting(false);
    if (error) {
      toast({ variant: "destructive", title: "Couldn't update password", description: error.message });
      return;
    }
    toast({ title: "Password updated", description: "You're signed in with the new password." });
    navigate("/dashboard", { replace: true });
  };

  return (
    <>
      <SEO title="Set a new password" description="Choose a new password to secure your account." />
      <div className="min-h-screen flex items-center justify-center px-6 py-12 bg-gradient-to-br from-background via-background to-primary/5">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <img src={logo} alt="Logo" className="w-14 h-14 mx-auto mb-4 rounded-2xl shadow-elegant" />
            <h1 className="font-display text-3xl font-bold text-foreground">Set a new password</h1>
            <p className="text-muted-foreground mt-2 text-sm">Your link is valid for one use only.</p>
          </div>

          {!ready ? (
            <div className="text-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary mx-auto" /></div>
          ) : invalid ? (
            <div className="bg-card rounded-2xl border border-destructive/40 p-6 text-center">
              <p className="font-semibold text-foreground mb-2">This reset link is invalid or expired.</p>
              <p className="text-sm text-muted-foreground mb-4">Request a new link to continue.</p>
              <Button onClick={() => navigate("/forgot-password")} className="w-full">Request new link</Button>
            </div>
          ) : (
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 bg-card rounded-2xl border border-border/60 p-6 shadow-elegant">
              <div className="space-y-2">
                <Label htmlFor="new-password">New password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input id="new-password" type="password" placeholder="At least 8 characters" className="pl-10 h-12" {...form.register("password")} />
                </div>
                {form.formState.errors.password && <p className="text-sm text-destructive">{form.formState.errors.password.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input id="confirm-password" type="password" placeholder="Repeat new password" className="pl-10 h-12" {...form.register("confirm")} />
                </div>
                {form.formState.errors.confirm && <p className="text-sm text-destructive">{form.formState.errors.confirm.message}</p>}
              </div>

              <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/40 border border-border/40 rounded-lg p-3">
                <ShieldCheck className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <span>Use a strong password you don't use elsewhere. We check passwords against known data breaches.</span>
              </div>

              <Button variant="hero" size="lg" className="w-full" disabled={submitting}>
                {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Update password"}
              </Button>
            </form>
          )}
        </div>
      </div>
    </>
  );
}
