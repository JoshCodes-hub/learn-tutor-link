import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Loader2, Save, Printer, FileDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentSchool } from "@/hooks/useCurrentSchool";
import AppScreen from "@/components/app-shell/AppScreen";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { generateReportCards, gradeFor, remarkFor, type ReportStudent } from "@/lib/reportCard";

const grade = (t: number) => {
  if (t >= 75) return { g: "A", c: "bg-success text-success-foreground" };
  if (t >= 65) return { g: "B", c: "bg-emerald-500 text-white" };
  if (t >= 55) return { g: "C", c: "bg-amber-500 text-white" };
  if (t >= 45) return { g: "D", c: "bg-orange-500 text-white" };
  if (t >= 40) return { g: "E", c: "bg-rose-500 text-white" };
  return { g: "F", c: "bg-destructive text-destructive-foreground" };
};

export default function SchoolResults() {
  const { school, loading: sloading } = useCurrentSchool();
  const [classes, setClasses] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [terms, setTerms] = useState<any[]>([]);
  const [classId, setClassId] = useState<string | null>(null);
  const [subjectId, setSubjectId] = useState<string | null>(null);
  const [termId, setTermId] = useState<string | null>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [scores, setScores] = useState<Record<string, { ca1: number; ca2: number; exam: number; id?: string }>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!school) return;
    (async () => {
      const [{ data: c }, { data: s }, { data: t }] = await Promise.all([
        supabase.from("school_classes").select("*").eq("school_id", school.id).order("level"),
        supabase.from("school_subjects").select("*").eq("school_id", school.id).order("name"),
        supabase.from("school_terms").select("*").eq("school_id", school.id).order("session", { ascending: false }),
      ]);
      setClasses(c || []); setSubjects(s || []); setTerms(t || []);
      if (c?.[0]) setClassId(c[0].id);
      if (s?.[0]) setSubjectId(s[0].id);
      const cur = t?.find((x: any) => x.is_current) || t?.[0];
      if (cur) setTermId(cur.id);
    })();
  }, [school]);

  useEffect(() => {
    if (!school || !classId || !subjectId || !termId) return;
    setLoading(true);
    (async () => {
      const { data: roster } = await supabase
        .from("school_students")
        .select("*").eq("school_id", school.id).eq("class_id", classId).eq("is_active", true).order("full_name");
      setStudents(roster || []);

      const { data: existing } = await supabase
        .from("results")
        .select("*").eq("school_id", school.id).eq("class_id", classId).eq("subject_id", subjectId).eq("term_id", termId);

      const next: typeof scores = {};
      (roster || []).forEach((s: any) => {
        const found = (existing || []).find((r: any) => r.student_id === s.id);
        next[s.id] = {
          ca1: Number(found?.ca1 ?? 0),
          ca2: Number(found?.ca2 ?? 0),
          exam: Number(found?.exam ?? 0),
          id: found?.id,
        };
      });
      setScores(next);
      setLoading(false);
    })();
  }, [school, classId, subjectId, termId]);

  const totals = useMemo(() => {
    const out: Record<string, number> = {};
    Object.entries(scores).forEach(([sid, s]) => (out[sid] = (s.ca1 || 0) + (s.ca2 || 0) + (s.exam || 0)));
    return out;
  }, [scores]);

  const setVal = (sid: string, key: "ca1"|"ca2"|"exam", v: string) => {
    const max = key === "exam" ? 60 : 20;
    const n = Math.min(max, Math.max(0, Number(v) || 0));
    setScores((s) => ({ ...s, [sid]: { ...s[sid], [key]: n } }));
  };

  const save = async () => {
    if (!school || !classId || !subjectId || !termId) return;
    setSaving(true);
    // Compute totals + grade, then rank by total within this class+subject+term to set position
    const computed = students.map((s) => {
      const sc = scores[s.id];
      const total = (sc.ca1 || 0) + (sc.ca2 || 0) + (sc.exam || 0);
      return { id: s.id, ca1: sc.ca1, ca2: sc.ca2, exam: sc.exam, total };
    });
    const ranked = [...computed].sort((a, b) => b.total - a.total);
    const positionMap = new Map<string, number>();
    let prevTotal = -1, prevPos = 0;
    ranked.forEach((r, i) => {
      const pos = r.total === prevTotal ? prevPos : i + 1;
      positionMap.set(r.id, pos);
      prevTotal = r.total; prevPos = pos;
    });
    const rows = computed.map((r) => ({
      school_id: school.id, class_id: classId, subject_id: subjectId, term_id: termId,
      student_id: r.id, ca1: r.ca1, ca2: r.ca2, exam: r.exam, total: r.total,
      grade: gradeFor(r.total), position: positionMap.get(r.id),
    }));
    await supabase.from("results").delete().eq("school_id", school.id).eq("class_id", classId).eq("subject_id", subjectId).eq("term_id", termId);
    if (rows.length) {
      const { error } = await supabase.from("results").insert(rows);
      if (error) { toast.error(error.message); setSaving(false); return; }
    }
    toast.success("Results saved");
    setSaving(false);
  };

  const [generating, setGenerating] = useState(false);
  const generatePDF = async () => {
    if (!school || !classId || !termId) return toast.error("Pick a class and term");
    setGenerating(true);
    try {
      // Fetch ALL results for this class+term across every subject, plus subject names
      const [{ data: allRes }, { data: subj }, { data: roster }, { data: term }, { data: klass }] = await Promise.all([
        supabase.from("results").select("*").eq("school_id", school.id).eq("class_id", classId).eq("term_id", termId),
        supabase.from("school_subjects").select("id, name").eq("school_id", school.id),
        supabase.from("school_students").select("*").eq("school_id", school.id).eq("class_id", classId).eq("is_active", true).order("full_name"),
        supabase.from("school_terms").select("*").eq("id", termId).maybeSingle(),
        supabase.from("school_classes").select("*").eq("id", classId).maybeSingle(),
      ]);
      if (!roster || roster.length === 0) { toast.error("No students in this class"); setGenerating(false); return; }
      if (!allRes || allRes.length === 0) { toast.error("Save some results first"); setGenerating(false); return; }

      const subjectMap = new Map((subj || []).map((s: any) => [s.id, s.name]));

      // Compute per-student aggregate total to derive overall class position
      const aggregate = roster.map((st: any) => {
        const studentRows = allRes.filter((r: any) => r.student_id === st.id);
        const agg = studentRows.reduce((a: number, r: any) => a + Number(r.total || 0), 0);
        return { id: st.id, agg };
      });
      const ranked = [...aggregate].sort((a, b) => b.agg - a.agg);
      const overallPos = new Map<string, number>();
      let prev = -1, prevPos = 0;
      ranked.forEach((r, i) => {
        const p = r.agg === prev ? prevPos : i + 1;
        overallPos.set(r.id, p); prev = r.agg; prevPos = p;
      });

      const reportStudents: ReportStudent[] = roster.map((st: any) => {
        const studentRows = allRes
          .filter((r: any) => r.student_id === st.id)
          .map((r: any) => {
            const total = Number(r.total || 0);
            const g = r.grade || gradeFor(total);
            return {
              subject: subjectMap.get(r.subject_id) || "—",
              ca1: Number(r.ca1 || 0), ca2: Number(r.ca2 || 0), exam: Number(r.exam || 0),
              total, grade: g, remark: remarkFor(g),
            };
          })
          .sort((a, b) => a.subject.localeCompare(b.subject));
        return {
          id: st.id,
          full_name: st.full_name,
          admission_no: st.student_code,
          gender: st.gender,
          date_of_birth: st.date_of_birth,
          position: overallPos.get(st.id) || null,
          classSize: roster.length,
          rows: studentRows,
        };
      }).filter((s) => s.rows.length > 0);

      const blob = await generateReportCards({
        school: school as any,
        term: { session: term?.session || "", term: term?.term || 1 },
        klass: { level: klass?.level || "", arm: klass?.arm || "" },
        students: reportStudents,
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const safe = `${school.name}-${klass?.level || ""}${klass?.arm || ""}-T${term?.term || ""}-Reports`.replace(/\s+/g, "_");
      a.href = url; a.download = `${safe}.pdf`; a.click();
      URL.revokeObjectURL(url);
      toast.success(`Generated ${reportStudents.length} report card${reportStudents.length === 1 ? "" : "s"}`);
    } catch (e: any) {
      toast.error(e.message || "Could not generate report cards");
    } finally {
      setGenerating(false);
    }
  };

  if (sloading) return <AppScreen><Loader2 className="w-5 h-5 animate-spin text-primary mx-auto mt-20" /></AppScreen>;

  return (
    <AppScreen title="Results" subtitle="CA · Exam · Grade" back>
      <div className="max-w-3xl mx-auto pb-24">
        {/* Pickers */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          <Picker value={classId ?? ""} onChange={setClassId} options={classes.map((c) => ({ v: c.id, l: `${c.level} ${c.arm}` }))} placeholder="Class" />
          <Picker value={subjectId ?? ""} onChange={setSubjectId} options={subjects.map((s) => ({ v: s.id, l: s.name }))} placeholder="Subject" />
          <Picker value={termId ?? ""} onChange={setTermId} options={terms.map((t) => ({ v: t.id, l: `Term ${t.term} · ${t.session}` }))} placeholder="Term" />
        </div>

        {classes.length === 0 || subjects.length === 0 || terms.length === 0 ? (
          <div className="text-center py-12 rounded-3xl border border-dashed border-border/60">
            <p className="text-sm text-muted-foreground">Set up classes, subjects and a term first.</p>
          </div>
        ) : loading ? (
          <Loader2 className="w-5 h-5 animate-spin text-primary mx-auto" />
        ) : students.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-10">No students in this class.</p>
        ) : (
          <>
            {/* Header row */}
            <div className="grid grid-cols-12 gap-1 px-2 mb-1 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
              <div className="col-span-5">Student</div>
              <div className="col-span-1 text-center">CA1</div>
              <div className="col-span-1 text-center">CA2</div>
              <div className="col-span-2 text-center">Exam</div>
              <div className="col-span-3 text-right">Total · Grade</div>
            </div>
            <div className="space-y-1.5">
              {students.map((s, i) => {
                const total = totals[s.id] || 0;
                const g = grade(total);
                return (
                  <motion.div
                    key={s.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.015 }}
                    className="grid grid-cols-12 gap-1 items-center p-2 rounded-2xl bg-card border border-border/40"
                  >
                    <div className="col-span-5 flex items-center gap-2 min-w-0">
                      <div className="w-7 h-7 rounded-full bg-primary/15 text-primary flex items-center justify-center text-[10px] font-bold shrink-0">
                        {s.full_name.split(" ").map((n: string) => n[0]).slice(0, 2).join("")}
                      </div>
                      <div className="text-xs font-medium truncate">{s.full_name}</div>
                    </div>
                    <NumCell v={scores[s.id]?.ca1} max={20} onChange={(v) => setVal(s.id, "ca1", v)} />
                    <NumCell v={scores[s.id]?.ca2} max={20} onChange={(v) => setVal(s.id, "ca2", v)} />
                    <div className="col-span-2"><NumCell wide v={scores[s.id]?.exam} max={60} onChange={(v) => setVal(s.id, "exam", v)} /></div>
                    <div className="col-span-3 flex items-center justify-end gap-2">
                      <div className="font-display font-bold text-sm">{total}</div>
                      <span className={cn("w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold", g.c)}>{g.g}</span>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {students.length > 0 && (
        <div className="fixed bottom-16 inset-x-0 px-4 pb-3 bg-gradient-to-t from-background via-background to-transparent z-30 md:bottom-0" style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 4.5rem)" }}>
          <div className="max-w-3xl mx-auto">
            <Button onClick={save} disabled={saving} className="w-full h-12 rounded-2xl bg-gradient-primary text-primary-foreground font-semibold shadow-glow">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4 mr-2" /> Save broadsheet</>}
            </Button>
          </div>
        </div>
      )}
    </AppScreen>
  );
}

const Picker = ({ value, onChange, options, placeholder }: any) => (
  <select value={value} onChange={(e) => onChange(e.target.value)} className="h-10 px-2 rounded-xl border border-border bg-card text-xs font-medium truncate">
    <option value="" disabled>{placeholder}</option>
    {options.map((o: any) => <option key={o.v} value={o.v}>{o.l}</option>)}
  </select>
);

const NumCell = ({ v, max, onChange, wide }: { v?: number; max: number; onChange: (v: string) => void; wide?: boolean }) => (
  <input
    type="number" min={0} max={max} value={v ?? 0}
    onChange={(e) => onChange(e.target.value)}
    className={cn("h-9 rounded-lg border border-border/60 bg-background text-center text-xs font-medium focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20",
      wide ? "w-full" : "w-full col-span-1")}
  />
);
