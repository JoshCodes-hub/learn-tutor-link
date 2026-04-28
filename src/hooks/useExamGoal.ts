import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface ExamGoal {
  id: string;
  user_id: string;
  target_date: string; // ISO date
  target_score: number;
  weekly_quiz_target: number;
  exam_label: string | null;
  is_active: boolean;
}

export function useExamGoal() {
  const { user } = useAuth();
  const [goal, setGoal] = useState<ExamGoal | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("exam_goals" as any)
      .select("*")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    setGoal((data as any) || null);
    setLoading(false);
  }, [user]);

  useEffect(() => { refresh(); }, [refresh]);

  const saveGoal = useCallback(async (input: { target_date: string; target_score: number; weekly_quiz_target: number; exam_label?: string }) => {
    if (!user) return;
    // Deactivate previous
    await supabase.from("exam_goals" as any).update({ is_active: false }).eq("user_id", user.id).eq("is_active", true);
    const { data } = await supabase.from("exam_goals" as any).insert({
      user_id: user.id,
      target_date: input.target_date,
      target_score: input.target_score,
      weekly_quiz_target: input.weekly_quiz_target,
      exam_label: input.exam_label || null,
    }).select().single();
    setGoal((data as any) || null);
    return data;
  }, [user]);

  return { goal, loading, refresh, saveGoal };
}
