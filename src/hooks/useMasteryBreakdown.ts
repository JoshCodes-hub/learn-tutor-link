import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface MasteryRow {
  course_id: string;
  course_name: string;
  topic_id: string | null;
  topic_label: string;
  attempted: number;
  correct: number;
  accuracy: number;
  avg_time_sec: number;
  // AI-style label
  gap_type: "concept" | "speed" | "balanced" | "mastered";
}

const SPEED_THRESHOLD = 35; // seconds per question — above = slow

export function useMasteryBreakdown(userId: string | undefined) {
  const [rows, setRows] = useState<MasteryRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    let alive = true;
    (async () => {
      setLoading(true);

      const since = new Date();
      since.setDate(since.getDate() - 60);

      // Pull recent attempts ids
      const { data: atts } = await supabase
        .from("quiz_attempts")
        .select("id")
        .eq("user_id", userId)
        .gte("started_at", since.toISOString());
      const attemptIds = (atts || []).map((a) => a.id);

      if (attemptIds.length === 0) {
        if (alive) { setRows([]); setLoading(false); }
        return;
      }

      const { data: ans } = await supabase
        .from("quiz_answers")
        .select("is_correct, time_spent_seconds, questions!inner(id, topic_id, course_id, courses:course_id(name))")
        .in("attempt_id", attemptIds);

      const map = new Map<string, MasteryRow>();
      (ans || []).forEach((row: any) => {
        const courseId = row.questions?.course_id || "unknown";
        const courseName = row.questions?.courses?.name || "General";
        const topicId = row.questions?.topic_id || null;
        const key = `${courseId}::${topicId || "all"}`;
        const cur = map.get(key) || {
          course_id: courseId,
          course_name: courseName,
          topic_id: topicId,
          topic_label: courseName,
          attempted: 0,
          correct: 0,
          accuracy: 0,
          avg_time_sec: 0,
          gap_type: "balanced" as const,
        };
        cur.attempted += 1;
        if (row.is_correct) cur.correct += 1;
        cur.avg_time_sec = (cur.avg_time_sec * (cur.attempted - 1) + (row.time_spent_seconds || 0)) / cur.attempted;
        map.set(key, cur);
      });

      const out = Array.from(map.values()).map((r) => {
        r.accuracy = r.attempted ? Math.round((r.correct / r.attempted) * 100) : 0;
        const slow = r.avg_time_sec > SPEED_THRESHOLD;
        const lowAcc = r.accuracy < 65;
        if (r.accuracy >= 85 && !slow) r.gap_type = "mastered";
        else if (lowAcc && slow) r.gap_type = "concept";
        else if (lowAcc) r.gap_type = "concept";
        else if (slow) r.gap_type = "speed";
        else r.gap_type = "balanced";
        return r;
      }).sort((a, b) => a.accuracy - b.accuracy);

      if (alive) { setRows(out); setLoading(false); }
    })();
    return () => { alive = false; };
  }, [userId]);

  return { rows, loading };
}
