import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Layers, Loader2 } from "lucide-react";
import { SEO } from "@/components/seo/SEO";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { facultiesOf } from "@/config/universities";
import { toast } from "sonner";

export default function ChooseFaculty() {
  const navigate = useNavigate();
  const { user, profile, refreshProfile } = useAuth();
  const university = (profile as any)?.university;
  const [saving, setSaving] = useState<string | null>(null);
  const list = facultiesOf(university);

  if (!university) { navigate("/onboarding/university", { replace: true }); return null; }

  const choose = async (f: string) => {
    if (!user) return;
    setSaving(f);
    const { error } = await supabase.from("profiles").update({ faculty: f, department: null }).eq("id", user.id);
    setSaving(null);
    if (error) { toast.error(error.message); return; }
    await refreshProfile();
    navigate("/onboarding/department");
  };

  return (
    <>
      <SEO title="Choose your faculty" noindex />
      <main className="min-h-screen bg-background py-10 px-4">
        <div className="max-w-2xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
            <p className="text-[11px] uppercase tracking-[0.25em] text-amber-700 mb-2 font-semibold">Step 2 of 4 · {university}</p>
            <h1 className="font-display text-3xl font-bold">Pick your faculty</h1>
          </motion.div>
          <div className="grid gap-2.5">
            {list.map((f, i) => (
              <motion.button
                key={f}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.03 * i }}
                onClick={() => choose(f)}
                disabled={!!saving}
                className="flex items-center gap-3 rounded-xl border bg-white p-4 text-left hover:border-amber-400 hover:shadow-sm transition-all"
              >
                <span className="w-10 h-10 rounded-lg bg-amber-50 border border-amber-200/70 flex items-center justify-center">
                  <Layers className="w-5 h-5 text-amber-600" />
                </span>
                <span className="font-semibold flex-1">{f}</span>
                {saving === f && <Loader2 className="w-4 h-4 animate-spin text-amber-500" />}
              </motion.button>
            ))}
          </div>
        </div>
      </main>
    </>
  );
}