import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import AppScreen from "@/components/app-shell/AppScreen";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Download, FileText, ShieldCheck, Award, Share2 } from "lucide-react";
import { toast } from "sonner";
import { generateReportCards, gradeFor, remarkFor, type ReportStudent } from "@/lib/reportCard";
import { issueVerification } from "@/lib/reportCardVerification";
import { shareContent, haptic } from "@/lib/native";

type TermOption = {
  id: string;
  session: string;
  term: number;
  is_current: boolean;
  school_id: string;
};

export default function MyReportCard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [terms, setTerms] = useState<TermOption[]>([]);
  const [studentRow, setStudentRow] = useState<any>(null);
  const [school, setSchool] = useState<any>(null);
  const [klass, setKlass] = useState<any>(null);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      if (!user) return;
      setLoading(true);
      try {
        const { data: student } = await supabase
          .from("school_students")
          .select("*, school_classes(*), schools(*)")
          .eq("user_id", user.id)
          .maybeSingle();

        if (!student) {
          setLoading(false);
          return;
        }
        setStudentRow(student);
        setKlass(student.school_classes);
        setSchool(student.schools);

        const { data: t } = await supabase
          .from("school_terms")
          .select("*")
          .eq("school_id", student.school_id)
          .order("session", { ascending: false })
          .order("term", { ascending: false });

        // Only show terms with results
        const { data: rs } = await supabase
          .from("results")
          .select("term_id")
          .eq("student_id", student.id);
        const termsWithResults = new Set((rs || []).map((r: any) => r.term_id));
        setTerms((t || []).filter((x: any) => termsWithResults.has(x.id)));
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  const download = async (term: TermOption) => {
    if (!studentRow || !school || !klass) return;
    setBusy(term.id);
    try {
      const [{ data: results }, { data: subjects }, { data: classmates }] = await Promise.all([
        supabase.from("results").select("*").eq("student_id", studentRow.id).eq("term_id", term.id),
        supabase.from("school_subjects").select("id, name").eq("school_id", school.id),
        supabase.from("school_students").select("id").eq("school_id", school.id).eq("class_id", klass.id).eq("is_active", true),
      ]);

      if (!results || results.length === 0) {
        toast.error("No results have been published for this term yet.");
        setBusy(null);
        return;
      }

      const subjectMap = new Map((subjects || []).map((s: any) => [s.id, s.name]));
      const classSize = (classmates || []).length || 1;

      // Compute this student's overall position by aggregating all classmates' results for this term
      const { data: allResults } = await supabase
        .from("results")
        .select("student_id, total")
        .eq("class_id", klass.id)
        .eq("term_id", term.id);
      const aggMap = new Map<string, number>();
      (allResults || []).forEach((r: any) => {
        aggMap.set(r.student_id, (aggMap.get(r.student_id) || 0) + Number(r.total || 0));
      });
      const ranked = [...aggMap.entries()].sort((a, b) => b[1] - a[1]);
      let position = 0, prev = -1, prevPos = 0;
      ranked.forEach(([sid, total], i) => {
        const pos = total === prev ? prevPos : i + 1;
        if (sid === studentRow.id) position = pos;
        prev = total; prevPos = pos;
      });

      const rows = results.map((r: any) => {
        const total = Number(r.total || 0);
        const g = r.grade || gradeFor(total);
        return {
          subject: subjectMap.get(r.subject_id) || "—",
          ca1: Number(r.ca1 || 0),
          ca2: Number(r.ca2 || 0),
          exam: Number(r.exam || 0),
          total,
          grade: g,
          remark: remarkFor(g),
        };
      }).sort((a, b) => a.subject.localeCompare(b.subject));

      const totals = rows.reduce((a, r) => a + r.total, 0);
      const average = rows.length ? totals / rows.length : 0;

      const reportStudent: ReportStudent = {
        id: studentRow.id,
        full_name: studentRow.full_name,
        admission_no: studentRow.student_code,
        gender: studentRow.gender,
        date_of_birth: studentRow.date_of_birth,
        position,
        classSize,
        rows,
      };

      // Persist verification
      await issueVerification({
        schoolId: school.id,
        schoolName: school.name,
        studentId: studentRow.id,
        studentName: studentRow.full_name,
        termId: term.id,
        term: term.term,
        session: term.session,
        classId: klass.id,
        classLabel: `${klass.level} ${klass.arm}`,
        totalScore: totals,
        averageScore: average,
        position,
        classSize,
        issuedBy: user?.id || null,
      });

      const blob = await generateReportCards({
        school: school as any,
        term: { session: term.session, term: term.term },
        klass: { level: klass.level, arm: klass.arm },
        students: [reportStudent],
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const safe = `${studentRow.full_name}-T${term.term}-${term.session}-Report`.replace(/[^A-Za-z0-9]+/g, "_");
      a.href = url;
      a.download = `${safe}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Report card downloaded");
    } catch (e: any) {
      toast.error(e.message || "Could not generate report card");
    } finally {
      setBusy(null);
    }
  };

  if (loading) return <AppScreen title="My report card" back><Loader2 className="w-5 h-5 animate-spin text-primary mx-auto mt-20" /></AppScreen>;

  if (!studentRow) {
    return (
      <AppScreen title="My report card" back>
        <div className="max-w-lg mx-auto text-center py-16">
          <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <p className="font-display text-lg font-semibold">No school record found</p>
          <p className="text-sm text-muted-foreground mt-2">Ask your school administrator to link your account so you can download your report cards.</p>
        </div>
      </AppScreen>
    );
  }

  return (
    <AppScreen title="My report card" subtitle={`${school.name} · ${klass.level} ${klass.arm}`} back>
      <div className="max-w-2xl mx-auto pb-12">
        <Card variant="elevated" className="mb-5 bg-gradient-to-br from-primary/10 to-accent/5 border-primary/20">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary/15 text-primary flex items-center justify-center">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <p className="font-display font-bold">Branded · verifiable · print-ready</p>
              <p className="text-xs text-muted-foreground">Each download includes a unique verification ID anyone can check at <code className="font-mono text-foreground">/verify</code>.</p>
            </div>
          </CardContent>
        </Card>

        {terms.length === 0 ? (
          <div className="text-center py-12 rounded-2xl border border-dashed border-border/60">
            <p className="text-sm text-muted-foreground">No graded terms yet. Once your teachers publish results you'll be able to download your report cards here.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {terms.map((t) => (
              <Card key={t.id} className="p-4 flex items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-foreground">Term {t.term} · {t.session}</p>
                  {t.is_current && <span className="text-[10px] uppercase tracking-wider bg-success/15 text-success px-1.5 py-0.5 rounded font-bold">Current</span>}
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={async () => {
                    void haptic("light");
                    const url = `${window.location.origin}/verify`;
                    await shareContent({
                      title: `My ${school.name} report card`,
                      text: `Term ${t.term} · ${t.session} report card from ${school.name}. Verify at ${url}`,
                      url,
                      dialogTitle: "Share report card",
                    });
                  }}>
                    <Share2 className="w-4 h-4" />
                  </Button>
                  <Button onClick={() => download(t)} disabled={busy === t.id}>
                    {busy === t.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Download className="w-4 h-4 mr-2" /> Download PDF</>}
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}

        <div className="mt-6 p-4 rounded-xl bg-muted/40 border border-border/40 text-xs text-muted-foreground flex items-start gap-2">
          <ShieldCheck className="w-4 h-4 text-primary shrink-0 mt-0.5" />
          <span>Recipients can validate the report card by entering the printed verification ID at the public verify page.</span>
        </div>
      </div>
    </AppScreen>
  );
}
