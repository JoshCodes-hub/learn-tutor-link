import { supabase } from "@/integrations/supabase/client";
import { listCachedMaterialsByCourse } from "@/lib/offlineLibraryCache";

/**
 * Exam Readiness Engine — 5 weighted signals (sum = 100).
 * Each signal returns a 0–100 score; final score is the weighted blend.
 */
export interface SignalBreakdown {
  key: "quiz_performance" | "quiz_coverage" | "flashcard_mastery" | "mock_exams" | "consistency";
  label: string;
  weight: number;        // percent contribution to final score
  score: number;         // 0–100
  detail?: string;       // short human hint
}
export interface ReadinessResult {
  score: number;         // 0–100 weighted
  band: "needs-work" | "building" | "ready";
  signals: SignalBreakdown[];
}

const WEIGHTS = {
  quiz_performance: 30,
  quiz_coverage: 15,
  flashcard_mastery: 20,
  mock_exams: 20,
  consistency: 15,
} as const;

function band(score: number): ReadinessResult["band"] {
  if (score >= 75) return "ready";
  if (score >= 50) return "building";
  return "needs-work";
}

function blend(signals: SignalBreakdown[]): number {
  const total = signals.reduce((s, x) => s + x.weight, 0) || 100;
  const sum = signals.reduce((s, x) => s + x.score * x.weight, 0);
  return Math.max(0, Math.min(100, Math.round(sum / total)));
}

/** Per-course readiness — used by CourseProgressCard. */
export async function computeCourseReadiness(opts: {
  userId: string;
  courseId: string;
  totalDocs: number;
  totalQuizzes: number;
  totalFlashcards: number;
}): Promise<ReadinessResult & { offlineCount: number; quizCompleted: number; quizAvg: number; cardsReviewed: number }> {
  const { userId, courseId, totalDocs, totalQuizzes, totalFlashcards } = opts;

  // 1) Quizzes in this course
  const { data: quizIds } = await supabase
    .from("quizzes").select("id, course_id").eq("course_id", courseId).eq("is_active", true);
  const ids = (quizIds ?? []).map((q: any) => q.id);
  let quizCompleted = 0; let quizAvg = 0;
  if (ids.length > 0) {
    const { data: attempts } = await supabase
      .from("quiz_attempts")
      .select("quiz_id, score, total_questions, completed_at")
      .eq("user_id", userId).in("quiz_id", ids).not("completed_at", "is", null);
    const seen = new Set<string>(); let pct = 0; let n = 0;
    for (const a of attempts ?? []) {
      if (seen.has(a.quiz_id)) continue;
      seen.add(a.quiz_id);
      if ((a.total_questions ?? 0) > 0) { pct += (a.score / a.total_questions) * 100; n++; }
    }
    quizCompleted = seen.size;
    quizAvg = n > 0 ? Math.round(pct / n) : 0;
  }

  // 2) Flashcards reviewed (SRS) — scoped by source_id in this course's flashcards
  let cardsReviewed = 0;
  if (totalFlashcards > 0) {
    const { data: fcIds } = await supabase
      .from("flashcards").select("id").eq("course_id", courseId).limit(2000);
    const fids = (fcIds ?? []).map((r: any) => r.id);
    if (fids.length > 0) {
      const { data: srs } = await supabase
        .from("srs_cards").select("id, repetitions, source_id").eq("user_id", userId).in("source_id", fids);
      cardsReviewed = (srs ?? []).filter((c: any) => (c.repetitions ?? 0) >= 1).length;
    }
  }

  // 3) Mock exams (global, not per-course — best proxy we have)
  const { data: mocks } = await supabase
    .from("mock_exam_attempts")
    .select("score, total, completed_at")
    .eq("user_id", userId).not("completed_at", "is", null)
    .order("completed_at", { ascending: false }).limit(5);
  let mockScore = 0;
  const mList = (mocks ?? []).filter((m: any) => (m.total ?? 0) > 0);
  if (mList.length > 0) {
    mockScore = Math.round(mList.reduce((s: number, m: any) => s + (m.score / m.total) * 100, 0) / mList.length);
  }

  // 4) Consistency — streak (cap at 14 days)
  const { data: streak } = await supabase
    .from("study_streaks").select("current_streak").eq("user_id", userId).maybeSingle();
  const streakScore = Math.min(100, Math.round(((streak?.current_streak ?? 0) / 14) * 100));

  // 5) Doc engagement: offline cached docs for this course
  let offlineCount = 0;
  try { offlineCount = (await listCachedMaterialsByCourse(courseId)).length; } catch {}
  const docPct = totalDocs > 0 ? Math.round((Math.min(offlineCount, totalDocs) / totalDocs) * 100) : 0;

  const quizCovPct = totalQuizzes > 0 ? Math.round((quizCompleted / totalQuizzes) * 100) : 0;
  const cardPct = totalFlashcards > 0 ? Math.round((Math.min(cardsReviewed, totalFlashcards) / totalFlashcards) * 100) : 0;

  // Combine doc engagement into coverage signal (averaged) so we keep 5 signals clean.
  const coverage = totalDocs > 0 && totalQuizzes > 0 ? Math.round((quizCovPct + docPct) / 2)
                  : totalDocs > 0 ? docPct : quizCovPct;

  const signals: SignalBreakdown[] = [
    { key: "quiz_performance", label: "Quiz performance", weight: WEIGHTS.quiz_performance, score: quizAvg,
      detail: quizCompleted > 0 ? `avg ${quizAvg}% on ${quizCompleted} quiz${quizCompleted === 1 ? "" : "zes"}` : "Take a quiz" },
    { key: "quiz_coverage", label: "Course coverage", weight: WEIGHTS.quiz_coverage, score: coverage,
      detail: `${quizCompleted}/${totalQuizzes} quizzes · ${offlineCount}/${totalDocs} docs` },
    { key: "flashcard_mastery", label: "Flashcard mastery", weight: WEIGHTS.flashcard_mastery, score: cardPct,
      detail: totalFlashcards > 0 ? `${cardsReviewed}/${totalFlashcards} reviewed` : "Add flashcards" },
    { key: "mock_exams", label: "Mock exam score", weight: WEIGHTS.mock_exams, score: mockScore,
      detail: mList.length > 0 ? `avg ${mockScore}% · last ${mList.length}` : "No mock exam yet" },
    { key: "consistency", label: "Study consistency", weight: WEIGHTS.consistency, score: streakScore,
      detail: `${streak?.current_streak ?? 0}-day streak` },
  ];
  const score = blend(signals);
  return { score, band: band(score), signals, offlineCount, quizCompleted, quizAvg, cardsReviewed };
}

/** Global readiness — used by dashboard ExamReadinessWidget. */
export async function computeGlobalReadiness(userId: string, opts?: { level?: string | null }): Promise<ReadinessResult & { weakCourses: { name: string; courseId: string | null }[] }> {
  const level = opts?.level ?? null;

  // Quiz attempts (last 60)
  const { data: attempts } = await supabase
    .from("quiz_attempts")
    .select("score, total_questions, completed_at, quiz:quizzes!inner(level, course:courses(id, name, level))")
    .eq("user_id", userId).not("completed_at", "is", null)
    .order("completed_at", { ascending: false }).limit(60);
  const matched = (attempts ?? []).filter((a: any) => {
    if (!level) return true;
    const qLvl = a.quiz?.level ?? null;
    const cLvl = a.quiz?.course?.level ?? null;
    return (qLvl === null || qLvl === level) && (cLvl === null || cLvl === level);
  });
  let quizAvg = 0;
  if (matched.length > 0) {
    const pcts = matched.map((a: any) => (a.total_questions > 0 ? (a.score / a.total_questions) * 100 : (a.score || 0)));
    quizAvg = Math.round(pcts.reduce((s: number, p: number) => s + p, 0) / pcts.length);
  }

  // Course coverage proxy: distinct courses attempted (cap at 6)
  const courseSet = new Set<string>();
  matched.forEach((a: any) => { if (a.quiz?.course?.id) courseSet.add(a.quiz.course.id); });
  const coverage = Math.min(100, Math.round((courseSet.size / 6) * 100));

  // Flashcard mastery — SRS cards reviewed at least once
  const { count: srsTotal } = await supabase
    .from("srs_cards").select("id", { count: "exact", head: true }).eq("user_id", userId);
  const { count: srsReviewed } = await supabase
    .from("srs_cards").select("id", { count: "exact", head: true }).eq("user_id", userId).gte("repetitions", 1);
  const cardPct = (srsTotal ?? 0) > 0 ? Math.round(((srsReviewed ?? 0) / (srsTotal ?? 1)) * 100) : 0;

  // Mock exams
  const { data: mocks } = await supabase
    .from("mock_exam_attempts").select("score, total, completed_at")
    .eq("user_id", userId).not("completed_at", "is", null)
    .order("completed_at", { ascending: false }).limit(5);
  const mList = (mocks ?? []).filter((m: any) => (m.total ?? 0) > 0);
  const mockScore = mList.length > 0
    ? Math.round(mList.reduce((s: number, m: any) => s + (m.score / m.total) * 100, 0) / mList.length) : 0;

  // Consistency
  const { data: streak } = await supabase
    .from("study_streaks").select("current_streak").eq("user_id", userId).maybeSingle();
  const streakScore = Math.min(100, Math.round(((streak?.current_streak ?? 0) / 14) * 100));

  const signals: SignalBreakdown[] = [
    { key: "quiz_performance", label: "Quiz performance", weight: WEIGHTS.quiz_performance, score: quizAvg,
      detail: matched.length > 0 ? `avg ${quizAvg}% on ${matched.length} attempts` : "Take a quiz to start" },
    { key: "quiz_coverage", label: "Course coverage", weight: WEIGHTS.quiz_coverage, score: coverage,
      detail: `${courseSet.size} course${courseSet.size === 1 ? "" : "s"} touched` },
    { key: "flashcard_mastery", label: "Flashcard mastery", weight: WEIGHTS.flashcard_mastery, score: cardPct,
      detail: (srsTotal ?? 0) > 0 ? `${srsReviewed ?? 0}/${srsTotal} reviewed` : "Add flashcards" },
    { key: "mock_exams", label: "Mock exam score", weight: WEIGHTS.mock_exams, score: mockScore,
      detail: mList.length > 0 ? `avg ${mockScore}%` : "No mock exam yet" },
    { key: "consistency", label: "Study consistency", weight: WEIGHTS.consistency, score: streakScore,
      detail: `${streak?.current_streak ?? 0}-day streak` },
  ];
  const score = blend(signals);

  // Weak courses — by avg pct, lowest 3 below 70%
  const byCourse = new Map<string, { sum: number; n: number; id: string | null; name: string }>();
  matched.forEach((a: any) => {
    const name = a.quiz?.course?.name as string | undefined;
    if (!name) return;
    const cur = byCourse.get(name) ?? { sum: 0, n: 0, id: a.quiz?.course?.id ?? null, name };
    const pct = a.total_questions > 0 ? (a.score / a.total_questions) * 100 : (a.score || 0);
    cur.sum += pct; cur.n += 1;
    byCourse.set(name, cur);
  });
  const weakCourses = Array.from(byCourse.values())
    .map((v) => ({ name: v.name, avg: v.sum / v.n, courseId: v.id }))
    .filter((x) => x.avg < 70).sort((a, b) => a.avg - b.avg).slice(0, 3)
    .map((x) => ({ name: x.name, courseId: x.courseId }));

  return { score, band: band(score), signals, weakCourses };
}