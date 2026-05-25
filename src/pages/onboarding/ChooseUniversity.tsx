import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { GraduationCap, Loader2 } from "lucide-react";
import { SEO } from "@/components/seo/SEO";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { UNIVERSITY_LIST, UniversityCode } from "@/config/universities";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function ChooseUniversity() {
  const navigate = useNavigate();
  const { user, refreshProfile } = useAuth();
  const [saving, setSaving] = useState<UniversityCode | null>(null);

  const choose = async (code: UniversityCode) => {
    if (!user) return;
    setSaving(code);
    const { error } = await supabase.from("profiles").update({ university: code, faculty: null, department: null }).eq("id", user.id);
    setSaving(null);
    if (error) { toast.error(error.message); return; }
    await refreshProfile();
    navigate("/onboarding/faculty");
  };

  return (
    <>
      <SEO title="Choose your university" description="Pick your university so OverraPrep can scope courses, tutors and study material to you." noindex />
      <main className="min-h-screen bg-background py-10 px-4">
        <div className="max-w-2xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10">
            <p className="text-[11px] uppercase tracking-[0.25em] text-amber-700 mb-2 font-semibold">Step 1 of 4</p>
            <h1 className="font-display text-3xl md:text-4xl font-bold">Which university are you at?</h1>
            <p className="text-sm text-muted-foreground mt-2">We tailor every course, tutor and material to your campus.</p>
          </motion.div>
          <div className="grid sm:grid-cols-2 gap-4">
            {UNIVERSITY_LIST.map((u, i) => (
              <motion.button
                key={u.code}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 + i * 0.05 }}
                onClick={() => choose(u.code)}
                disabled={!!saving}
                className={cn(
                  "text-left rounded-2xl border bg-white p-5 hover:border-amber-400 hover:shadow-lg transition-all",
                  "focus:outline-none focus:ring-2 focus:ring-amber-400",
                )}
              >
                <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-200/70 flex items-center justify-center mb-3">
                  <GraduationCap className="w-6 h-6 text-amber-600" />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xl font-bold tracking-tight">{u.code}</span>
                  {saving === u.code && <Loader2 className="w-4 h-4 animate-spin text-amber-500" />}
                </div>
                <p className="text-sm font-medium text-foreground mt-1">{u.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{u.city}</p>
              </motion.button>
            ))}
          </div>
          <p className="text-[11px] text-center text-muted-foreground mt-6">More universities coming soon.</p>
        </div>
      </main>
    </>
  );
}