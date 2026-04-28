import { supabase } from "@/integrations/supabase/client";

/** Build a stable verification id for a student's report card in a given term. */
export function buildVerificationId(opts: {
  schoolName: string;
  term: number;
  studentId: string;
  termId: string;
}) {
  const slug = (opts.schoolName.replace(/[^A-Z]/gi, "").slice(0, 3) || "SCH").toUpperCase();
  // Combine pieces of student & term IDs to stay opaque but reproducible.
  const sid = opts.studentId.replace(/-/g, "").slice(-4).toUpperCase();
  const tid = opts.termId.replace(/-/g, "").slice(-3).toUpperCase();
  return `${slug}-${opts.term}T-${sid}${tid}`;
}

/** Persist (or update) a verification record so the public verify page can validate it. */
export async function issueVerification(opts: {
  schoolId: string;
  schoolName: string;
  studentId: string;
  studentName: string;
  termId: string;
  term: number;
  session: string;
  classId?: string | null;
  classLabel?: string | null;
  totalScore: number;
  averageScore: number;
  position?: number | null;
  classSize: number;
  issuedBy?: string | null;
}) {
  const verification_id = buildVerificationId({
    schoolName: opts.schoolName,
    term: opts.term,
    studentId: opts.studentId,
    termId: opts.termId,
  });

  await supabase.from("report_card_verifications").upsert(
    {
      verification_id,
      school_id: opts.schoolId,
      student_id: opts.studentId,
      term_id: opts.termId,
      class_id: opts.classId || null,
      student_name: opts.studentName,
      school_name: opts.schoolName,
      class_label: opts.classLabel || null,
      term_label: `Term ${opts.term} · ${opts.session}`,
      total_score: opts.totalScore,
      average_score: opts.averageScore,
      position: opts.position ?? null,
      class_size: opts.classSize,
      issued_by: opts.issuedBy || null,
      issued_at: new Date().toISOString(),
    },
    { onConflict: "term_id,student_id" }
  );

  return verification_id;
}

export async function lookupVerification(verificationId: string) {
  const { data, error } = await supabase
    .from("report_card_verifications")
    .select("*")
    .eq("verification_id", verificationId.trim().toUpperCase())
    .maybeSingle();
  if (error) throw error;
  return data;
}
