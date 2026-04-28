import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type TutorOnboardingState = {
  profile_completed: boolean;
  course_created: boolean;
  quiz_created: boolean;
  bank_added: boolean;
  community_created: boolean;
  dismissed: boolean;
};

const DEFAULTS: TutorOnboardingState = {
  profile_completed: false,
  course_created: false,
  quiz_created: false,
  bank_added: false,
  community_created: false,
  dismissed: false,
};

/**
 * Computes (and caches) the tutor's onboarding progress by inspecting their
 * actual data, then mirrors it into the `tutor_onboarding` row. Tutors must
 * complete profile + first course + first quiz before publishing PAID quizzes.
 */
export function useTutorOnboarding() {
  const { user, profile } = useAuth();
  const [state, setState] = useState<TutorOnboardingState>(DEFAULTS);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [{ data: row }, { count: courseCount }, { count: quizCount }, { data: prof }, { count: bankCount }, { count: communityCount }] = await Promise.all([
        supabase.from("tutor_onboarding").select("*").eq("user_id", user.id).maybeSingle(),
        supabase.from("courses").select("id", { count: "exact", head: true }).eq("created_by", user.id),
        supabase.from("quizzes").select("id", { count: "exact", head: true }).eq("tutor_id", user.id),
        supabase.from("profiles").select("full_name, profile_image_url").eq("id", user.id).maybeSingle(),
        supabase.from("withdrawal_requests").select("id", { count: "exact", head: true }).eq("tutor_id", user.id),
        supabase.from("tutor_communities").select("id", { count: "exact", head: true }).eq("tutor_id", user.id),
      ]);

      const computed: TutorOnboardingState = {
        profile_completed: !!(prof?.full_name && prof?.profile_image_url),
        course_created: (courseCount || 0) > 0,
        quiz_created: (quizCount || 0) > 0,
        bank_added: (bankCount || 0) > 0,
        community_created: (communityCount || 0) > 0,
        dismissed: !!row?.dismissed,
      };

      setState(computed);

      // Persist progress
      await supabase.from("tutor_onboarding").upsert({
        user_id: user.id,
        ...computed,
        updated_at: new Date().toISOString(),
      });
    } catch (e) {
      console.error("tutor onboarding refresh failed", e);
    } finally {
      setLoading(false);
    }
  }, [user, profile]);

  useEffect(() => { refresh(); }, [refresh]);

  const dismiss = async () => {
    if (!user) return;
    await supabase.from("tutor_onboarding").upsert({
      user_id: user.id,
      ...state,
      dismissed: true,
      updated_at: new Date().toISOString(),
    });
    setState((s) => ({ ...s, dismissed: true }));
  };

  // Required steps before publishing PAID quizzes
  const canPublishPaid = state.profile_completed && state.course_created && state.quiz_created && state.bank_added;

  const completed = [state.profile_completed, state.course_created, state.quiz_created, state.bank_added, state.community_created].filter(Boolean).length;
  const total = 5;
  const percent = Math.round((completed / total) * 100);

  return { state, loading, refresh, dismiss, canPublishPaid, completed, total, percent };
}
