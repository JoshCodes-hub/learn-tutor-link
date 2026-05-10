import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type MockExam = {
  id: string; title: string; description: string | null;
  duration_min: number; total_questions: number;
  topic_ids: string[]; course_id: string | null;
  created_by: string; is_published: boolean; created_at: string;
};

export type MockQuestion = {
  id: string; question_text: string;
  option_a: string; option_b: string; option_c: string; option_d: string;
  correct_option: string; explanation: string | null;
  topic_id: string;
};

export function usePublishedExams() {
  return useQuery({
    queryKey: ["mock-exams", "published"],
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mock_exams")
        .select("*")
        .eq("is_published", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as MockExam[];
    },
  });
}

export function useMyAttempts() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["mock-attempts", user?.id],
    enabled: !!user?.id,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mock_exam_attempts")
        .select("*, exam:mock_exams(title, total_questions)")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export async function loadExamQuestions(examId: string): Promise<{ exam: MockExam; questions: MockQuestion[] }> {
  const { data: exam, error: e1 } = await supabase
    .from("mock_exams").select("*").eq("id", examId).maybeSingle();
  if (e1 || !exam) throw new Error(e1?.message || "Exam not found");
  const e = exam as MockExam;

  let q = supabase
    .from("questions")
    .select("id, question_text, option_a, option_b, option_c, option_d, correct_option, explanation, topic_id")
    .eq("is_approved", true);
  if (e.topic_ids && e.topic_ids.length) q = q.in("topic_id", e.topic_ids);
  else if (e.course_id) q = q.eq("course_id", e.course_id);

  const { data: qs, error: e2 } = await q.limit(Math.max(e.total_questions * 2, 50));
  if (e2) throw e2;
  // Shuffle and slice
  const shuffled = (qs ?? []).slice().sort(() => Math.random() - 0.5).slice(0, e.total_questions);
  return { exam: e, questions: shuffled as MockQuestion[] };
}

export function useSubmitAttempt() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      examId: string;
      answers: { question_id: string; selected: string; correct: string; topic_id: string }[];
      durationSeconds: number;
      tabBlurCount: number;
    }) => {
      if (!user?.id) throw new Error("not signed in");
      const score = input.answers.filter(a => a.selected === a.correct).length;
      const total = input.answers.length;

      // topic breakdown
      const buckets = new Map<string, { correct: number; total: number }>();
      input.answers.forEach(a => {
        const b = buckets.get(a.topic_id) ?? { correct: 0, total: 0 };
        b.total += 1;
        if (a.selected === a.correct) b.correct += 1;
        buckets.set(a.topic_id, b);
      });
      const topic_breakdown = Array.from(buckets.entries()).map(([topic_id, v]) => ({ topic_id, ...v }));

      const { data, error } = await supabase.from("mock_exam_attempts").insert({
        user_id: user.id,
        mock_exam_id: input.examId,
        completed_at: new Date().toISOString(),
        score, total,
        duration_seconds: input.durationSeconds,
        tab_blur_count: input.tabBlurCount,
        answers: input.answers,
        topic_breakdown,
      }).select("id").single();
      if (error) throw error;
      return { attemptId: data.id as string, score, total, topic_breakdown };
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["mock-attempts"] }),
  });
}
