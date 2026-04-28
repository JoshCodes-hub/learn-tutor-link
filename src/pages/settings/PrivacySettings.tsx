import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Shield, ArrowLeft, Download, Trash2, Lock, AlertTriangle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function PrivacySettings() {
  const navigate = useNavigate();
  const [confirmation, setConfirmation] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Not signed in");
      const uid = userData.user.id;

      const [profile, attempts, bookmarks, flashcards, goals] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", uid).maybeSingle(),
        supabase.from("quiz_attempts").select("*").eq("user_id", uid),
        supabase.from("bookmarked_questions").select("*").eq("user_id", uid),
        supabase.from("flashcards").select("*").eq("user_id", uid),
        supabase.from("exam_goals").select("*").eq("user_id", uid),
      ]);

      const blob = new Blob([JSON.stringify({
        exported_at: new Date().toISOString(),
        user: userData.user,
        profile: profile.data,
        quiz_attempts: attempts.data ?? [],
        bookmarks: bookmarks.data ?? [],
        flashcards: flashcards.data ?? [],
        exam_goals: goals.data ?? [],
      }, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `overraprep-data-${uid}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Your data has been exported");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setExporting(false);
    }
  };

  const handleDelete = async () => {
    if (confirmation !== "DELETE MY ACCOUNT") {
      toast.error('Type "DELETE MY ACCOUNT" exactly to confirm.');
      return;
    }
    setDeleting(true);
    try {
      const { data, error } = await supabase.functions.invoke("delete-account", {
        body: { confirmation },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      await supabase.auth.signOut();
      toast.success("Your account has been deleted");
      navigate("/");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-amber-50/30">
      <div className="container max-w-3xl mx-auto px-4 py-10">
        <Link to="/student/dashboard" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition mb-6">
          <ArrowLeft className="h-4 w-4" /> Back to dashboard
        </Link>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 shadow-lg shadow-amber-500/30 mb-4">
            <Lock className="h-7 w-7 text-white" />
          </div>
          <h1 className="font-serif text-4xl font-bold tracking-tight">Privacy & Data</h1>
          <p className="text-muted-foreground mt-2">Export, manage, or permanently delete your OverraPrep data.</p>
        </motion.div>

        <div className="grid gap-6">
          <Card className="p-6 border-amber-100/60">
            <div className="flex items-start gap-4">
              <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-amber-100 to-amber-200/60 border border-amber-200 flex items-center justify-center shrink-0">
                <Download className="h-5 w-5 text-amber-700" />
              </div>
              <div className="flex-1">
                <h2 className="font-serif text-xl font-semibold mb-1">Export your data</h2>
                <p className="text-sm text-muted-foreground mb-4">
                  Download a JSON archive of your profile, quiz attempts, bookmarks, flashcards and goals.
                </p>
                <Button onClick={handleExport} disabled={exporting} variant="outline" className="border-amber-200">
                  {exporting ? "Preparing…" : "Download my data"}
                </Button>
              </div>
            </div>
          </Card>

          <Card className="p-6 border-amber-100/60">
            <div className="flex items-start gap-4">
              <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-amber-100 to-amber-200/60 border border-amber-200 flex items-center justify-center shrink-0">
                <Shield className="h-5 w-5 text-amber-700" />
              </div>
              <div className="flex-1">
                <h2 className="font-serif text-xl font-semibold mb-1">Legal documents</h2>
                <p className="text-sm text-muted-foreground mb-4">Review the terms governing your use of OverraPrep.</p>
                <div className="flex flex-wrap gap-2">
                  <Button asChild variant="outline" size="sm" className="border-amber-200"><Link to="/terms">Terms of Service</Link></Button>
                  <Button asChild variant="outline" size="sm" className="border-amber-200"><Link to="/privacy">Privacy Policy</Link></Button>
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-6 border-red-200 bg-gradient-to-br from-red-50/50 to-white">
            <div className="flex items-start gap-4">
              <div className="h-11 w-11 rounded-xl bg-red-100 border border-red-200 flex items-center justify-center shrink-0">
                <Trash2 className="h-5 w-5 text-red-600" />
              </div>
              <div className="flex-1">
                <h2 className="font-serif text-xl font-semibold mb-1 text-red-900">Delete account</h2>
                <p className="text-sm text-red-800/80 mb-4">
                  This permanently removes your profile, quiz history, bookmarks, flashcards, and tokens. This cannot be undone.
                </p>
                <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 mb-4">
                  <AlertTriangle className="h-4 w-4 text-amber-700 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-900">
                    Tutor content (quizzes/courses) and report cards already issued by schools may be retained for record integrity.
                  </p>
                </div>
                <Label htmlFor="confirm" className="text-red-900 font-medium">
                  Type <span className="font-mono bg-red-100 px-1.5 py-0.5 rounded">DELETE MY ACCOUNT</span> to confirm
                </Label>
                <Input
                  id="confirm"
                  value={confirmation}
                  onChange={(e) => setConfirmation(e.target.value)}
                  placeholder="DELETE MY ACCOUNT"
                  className="mt-2 mb-3 border-red-200 focus-visible:ring-red-300"
                />
                <Button
                  onClick={handleDelete}
                  disabled={deleting || confirmation !== "DELETE MY ACCOUNT"}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  {deleting ? "Deleting…" : "Permanently delete my account"}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
