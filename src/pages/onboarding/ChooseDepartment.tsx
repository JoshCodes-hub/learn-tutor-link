import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { BookOpen, Loader2 } from "lucide-react";
import { SEO } from "@/components/seo/SEO";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { departmentsOf } from "@/config/universities";
import { toast } from "sonner";

export default function ChooseDepartment() {
  const navigate = useNavigate();
  const { user, profile, refreshProfile } = useAuth();
  const university = (profile as any)?.university;
  const faculty = (profile as any)?.faculty;
  const [saving, setSaving] = useState<string | null>(null);
  const list = departmentsOf(university, faculty);

  if (!university) { navigate("/onboarding/university", { replace: true }); return null; }
  if (!faculty) { navigate("/onboarding/faculty", { replace: true }); return null; }

  const choose = async (d: string) => {
    if (!user) return;
    setSaving(d);
    const { error } = await supabase.from("profiles").update({ department: d }).eq("id", user.id);
    setSaving(null);
    if (error) { toast.error(error.message); return; }
    await refreshProfile();
    navigate("/onboarding/level");
  };

  return (
    <>
      <SEO title="Choose your department" noindex />
      <main className="min-h-screen bg-background py-10 px-4">
        <div className="max-w-2xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
            <p className="text-[11px] uppercase tracking-[0.25em] text-amber-700 mb-2 font-semibold">Step 3 of 4 · {faculty}</p>
            <h1 className="font-display text-3xl font-bold">Pick your department</h1>
          </motion.div>
          <div className="grid gap-2.5">
            {list.map((d, i) => (
              <motion.button
                key={d}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.03 * i }}
                onClick={() => choose(d)}
                disabled={!!saving}
                className="flex items-center gap-3 rounded-xl border bg-white p-4 text-left hover:border-amber-400 hover:shadow-sm transition-all"
              >
                <span className="w-10 h-10 rounded-lg bg-amber-50 border border-amber-200/70 flex items-center justify-center">
                  <BookOpen className="w-5 h-5 text-amber-600" />
                </span>
                <span className="font-semibold flex-1">{d}</span>
                {saving === d && <Loader2 className="w-4 h-4 animate-spin text-amber-500" />}
              </motion.button>
            ))}
          </div>
        </div>
      </main>
    </>
  );
}