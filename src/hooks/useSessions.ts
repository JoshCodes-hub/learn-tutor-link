import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type SessionSlot = {
  id: string; tutor_id: string; curriculum_id: string | null;
  title: string; description: string | null;
  starts_at: string; duration_min: number; capacity: number;
  meeting_url: string | null; status: string;
  tutor?: { full_name: string | null; avatar_url: string | null; tutor_code: string | null };
  booked_count?: number;
  i_booked?: boolean;
};

export function useUpcomingSessions() {
  return useQuery({
    queryKey: ["session-slots", "upcoming"],
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tutor_session_slots")
        .select("*")
        .eq("status", "open")
        .gte("starts_at", new Date().toISOString())
        .order("starts_at", { ascending: true })
        .limit(50);
      if (error) throw error;
      const slots = (data ?? []) as SessionSlot[];
      const tutorIds = Array.from(new Set(slots.map(s => s.tutor_id)));
      if (tutorIds.length) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("id, full_name, avatar_url, tutor_code")
          .in("id", tutorIds);
        const map = new Map((profs ?? []).map((p: any) => [p.id, p]));
        slots.forEach(s => { s.tutor = map.get(s.tutor_id) as any; });
      }
      const ids = slots.map(s => s.id);
      if (ids.length) {
        const { data: bookings } = await supabase
          .from("session_bookings")
          .select("slot_id, student_id")
          .in("slot_id", ids)
          .eq("status", "confirmed");
        const counts = new Map<string, number>();
        const me = (await supabase.auth.getUser()).data.user?.id;
        const mine = new Set<string>();
        (bookings ?? []).forEach((b: any) => {
          counts.set(b.slot_id, (counts.get(b.slot_id) ?? 0) + 1);
          if (b.student_id === me) mine.add(b.slot_id);
        });
        slots.forEach(s => {
          s.booked_count = counts.get(s.id) ?? 0;
          s.i_booked = mine.has(s.id);
        });
      }
      return slots;
    },
  });
}

export function useTutorSlots() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["session-slots", "mine", user?.id],
    enabled: !!user?.id,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tutor_session_slots")
        .select("*")
        .eq("tutor_id", user!.id)
        .order("starts_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as SessionSlot[];
    },
  });
}

export function useMyBookings() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["session-bookings", "mine", user?.id],
    enabled: !!user?.id,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("session_bookings")
        .select("*, slot:tutor_session_slots(*)")
        .eq("student_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useBookSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (slotId: string) => {
      const { data, error } = await supabase.rpc("book_session", { _slot_id: slotId });
      if (error) throw error;
      return data as string;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["session-slots"] });
      qc.invalidateQueries({ queryKey: ["session-bookings"] });
    },
  });
}

export function useCreateSlot() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<SessionSlot> & { title: string; starts_at: string }) => {
      if (!user?.id) throw new Error("not signed in");
      const { error } = await supabase.from("tutor_session_slots").insert({
        tutor_id: user.id,
        title: input.title,
        description: input.description ?? null,
        starts_at: input.starts_at,
        duration_min: input.duration_min ?? 60,
        capacity: input.capacity ?? 1,
        meeting_url: input.meeting_url ?? null,
        curriculum_id: input.curriculum_id ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["session-slots"] }),
  });
}
