import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Loader2, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, AcademicPath, AcademicMetadata } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { SEO } from "@/components/seo/SEO";
import { cn } from "@/lib/utils";

interface Subject {
  id: string;
  name: string;
  category: AcademicPath;
  level: string | null;
}

const SECONDARY_LEVELS = ["JSS1", "JSS2", "JSS3", "SS1", "SS2", "SS3"];
const UNI_LEVELS = ["100", "200", "300", "400", "500"];

export default function RefinePath() {
  const navigate = useNavigate();
  const { user, refreshProfile } = useAuth();
  const { toast } = useToast();

  const [path, setPath] = useState<AcademicPath | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [meta, setMeta] = useState<AcademicMetadata>({ subjects: [] });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const stored = sessionStorage.getItem("pending_academic_path") as AcademicPath | null;
    if (!stored) {
      navigate("/onboarding/path", { replace: true });
      return;
    }
    setPath(stored);

    if (stored === "secondary" || stored === "jamb") {
      supabase
        .from("subjects")
        .select("*")
        .eq("category", stored)
        .eq("is_active", true)
        .order("name")
        .then(({ data }) => setSubjects((data || []) as Subject[]));
    }
  }, [navigate]);

  const toggleSubject = (name: string) => {
    setMeta((m) => {
      const list = m.subjects || [];
      return list.includes(name)
        ? { ...m, subjects: list.filter((s) => s !== name) }
        : { ...m, subjects: [...list, name] };
    });
  };

  const validate = (): string | null => {
    if (!path) return "Please choose a path first.";
    if (path === "secondary") {
      if (!meta.level) return "Pick your class level.";
      if ((meta.subjects || []).length === 0) return "Select at least one subject.";
    }
    if (path === "jamb") {
      if (!meta.target_course?.trim()) return "Enter your target course.";
      const subs = meta.subjects || [];
      if (subs.length !== 4) return "JAMB requires exactly 4 subjects (Use of English + 3 others).";
      if (!subs.includes("Use of English")) return "Use of English is compulsory.";
    }
    if (path === "university") {
      if (!meta.school?.trim()) return "Enter your school.";
      if (!meta.department?.trim()) return "Enter your department.";
      if (!meta.level) return "Pick your year level.";
    }
    return null;
  };

  const handleSubmit = async () => {
    const err = validate();
    if (err) {
      toast({ title: "Almost there", description: err, variant: "destructive" });
      return;
    }
    if (!user || !path) return;

    setSubmitting(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        academic_path: path,
        academic_metadata: meta as any,
        // Mirror department for legacy university flows
        ...(path === "university" && meta.department ? { department: meta.department } : {}),
      })
      .eq("id", user.id);

    if (error) {
      toast({ title: "Could not save", description: error.message, variant: "destructive" });
      setSubmitting(false);
      return;
    }

    sessionStorage.removeItem("pending_academic_path");
    await refreshProfile();
    toast({ title: "You're all set!", description: "Welcome to OverraPrep AI." });
    navigate("/student/dashboard", { replace: true });
  };

  if (!path) return null;

  return (
    <>
      <SEO title="Refine Your Path | OverraPrep AI" description="Tell us a bit more so we can personalize your study experience." />
      <main className="min-h-screen bg-background py-12 px-4">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-2xl mx-auto"
        >
          <div className="mb-8">
            <p className="text-sm uppercase tracking-[0.3em] text-primary mb-2">Step 2 of 2</p>
            <h1 className="font-display text-3xl md:text-4xl font-bold mb-2">
              {path === "secondary" && "Tell us about your secondary studies"}
              {path === "jamb" && "Set your JAMB target"}
              {path === "university" && "Your university details"}
            </h1>
            <p className="text-muted-foreground">
              We'll use this to surface the right courses, past questions, and difficulty.
            </p>
          </div>

          <div className="space-y-6 rounded-2xl border bg-card p-6">
            {path === "secondary" && (
              <>
                <div className="space-y-2">
                  <Label>Class level</Label>
                  <Select value={meta.level} onValueChange={(v) => setMeta({ ...meta, level: v })}>
                    <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
                    <SelectContent>
                      {SECONDARY_LEVELS.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <SubjectGrid subjects={subjects} selected={meta.subjects || []} onToggle={toggleSubject} />
              </>
            )}

            {path === "jamb" && (
              <>
                <div className="space-y-2">
                  <Label>Target course (e.g. Medicine, Law, Computer Science)</Label>
                  <Input
                    value={meta.target_course || ""}
                    onChange={(e) => setMeta({ ...meta, target_course: e.target.value })}
                    placeholder="What do you want to study?"
                  />
                </div>
                <div>
                  <Label className="block mb-2">Your 4 UTME subjects (Use of English compulsory)</Label>
                  <SubjectGrid subjects={subjects} selected={meta.subjects || []} onToggle={toggleSubject} maxNote="Pick 4" />
                </div>
              </>
            )}

            {path === "university" && (
              <>
                <div className="space-y-2">
                  <Label>School</Label>
                  <Input
                    value={meta.school || ""}
                    onChange={(e) => setMeta({ ...meta, school: e.target.value })}
                    placeholder="e.g. Federal University of Technology, Akure"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Department</Label>
                  <Input
                    value={meta.department || ""}
                    onChange={(e) => setMeta({ ...meta, department: e.target.value })}
                    placeholder="e.g. Computer Science"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Current level</Label>
                  <Select value={meta.level} onValueChange={(v) => setMeta({ ...meta, level: v })}>
                    <SelectTrigger><SelectValue placeholder="Select level" /></SelectTrigger>
                    <SelectContent>
                      {UNI_LEVELS.map((l) => <SelectItem key={l} value={l}>{l} Level</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            <div className="flex items-center justify-between pt-2">
              <Button variant="ghost" onClick={() => navigate("/onboarding/path")}>Back</Button>
              <Button onClick={handleSubmit} disabled={submitting}>
                {submitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving</> : <>Finish <ArrowRight className="w-4 h-4 ml-2" /></>}
              </Button>
            </div>
          </div>
        </motion.div>
      </main>
    </>
  );
}

function SubjectGrid({
  subjects, selected, onToggle, maxNote,
}: { subjects: Subject[]; selected: string[]; onToggle: (n: string) => void; maxNote?: string }) {
  if (subjects.length === 0) {
    return <p className="text-sm text-muted-foreground">Loading subjects…</p>;
  }
  return (
    <div>
      {maxNote && <p className="text-xs text-muted-foreground mb-2">{maxNote} · {selected.length} selected</p>}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {subjects.map((s) => {
          const active = selected.includes(s.name);
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => onToggle(s.name)}
              className={cn(
                "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm text-left transition-all",
                active
                  ? "border-primary bg-primary/10 text-foreground"
                  : "border-border bg-background hover:border-primary/40"
              )}
            >
              <Checkbox checked={active} className="pointer-events-none" />
              <span className="truncate">{s.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
