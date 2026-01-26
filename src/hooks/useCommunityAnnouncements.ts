import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface Announcement {
  id: string;
  community_id: string;
  title: string;
  content: string;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
}

export const useCommunityAnnouncements = (communityId?: string) => {
  const { user } = useAuth();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAnnouncements = async () => {
    if (!communityId) {
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("community_announcements")
        .select("*")
        .eq("community_id", communityId)
        .order("is_pinned", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) throw error;
      setAnnouncements(data || []);
    } catch (error) {
      console.error("Error fetching announcements:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const createAnnouncement = async (
    title: string,
    content: string,
    isPinned: boolean = false
  ) => {
    if (!communityId || !user) return null;

    try {
      const { data, error } = await supabase
        .from("community_announcements")
        .insert({
          community_id: communityId,
          title,
          content,
          is_pinned: isPinned,
        })
        .select()
        .single();

      if (error) throw error;

      setAnnouncements((prev) => [data, ...prev]);
      toast.success("Announcement posted!");

      // Create notifications for all community members
      await notifyMembers(communityId, title, data.id);

      return data;
    } catch (error: any) {
      console.error("Error creating announcement:", error);
      toast.error(error.message || "Failed to create announcement");
      return null;
    }
  };

  const updateAnnouncement = async (
    announcementId: string,
    title: string,
    content: string,
    isPinned: boolean
  ) => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from("community_announcements")
        .update({ title, content, is_pinned: isPinned })
        .eq("id", announcementId);

      if (error) throw error;

      setAnnouncements((prev) =>
        prev.map((a) =>
          a.id === announcementId ? { ...a, title, content, is_pinned: isPinned } : a
        )
      );
      toast.success("Announcement updated!");
      return true;
    } catch (error: any) {
      console.error("Error updating announcement:", error);
      toast.error(error.message || "Failed to update announcement");
      return false;
    }
  };

  const deleteAnnouncement = async (announcementId: string) => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from("community_announcements")
        .delete()
        .eq("id", announcementId);

      if (error) throw error;

      setAnnouncements((prev) => prev.filter((a) => a.id !== announcementId));
      toast.success("Announcement deleted!");
      return true;
    } catch (error: any) {
      console.error("Error deleting announcement:", error);
      toast.error(error.message || "Failed to delete announcement");
      return false;
    }
  };

  const notifyMembers = async (
    communityId: string,
    announcementTitle: string,
    announcementId: string
  ) => {
    try {
      // Get community info and members
      const { data: community } = await supabase
        .from("tutor_communities")
        .select("name, tutor_id")
        .eq("id", communityId)
        .single();

      if (!community) return;

      const { data: members } = await supabase
        .from("community_members")
        .select("user_id")
        .eq("community_id", communityId);

      if (!members || members.length === 0) return;

      // Get tutor name
      const { data: tutor } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", community.tutor_id)
        .single();

      // Create notifications for each member
      const notifications = members.map((member) => ({
        user_id: member.user_id,
        title: "New Community Announcement",
        message: `${tutor?.full_name || "Your tutor"} posted: "${announcementTitle}" in ${community.name}`,
        type: "info",
        link: `/community/${communityId}`,
      }));

      await supabase.from("notifications").insert(notifications);
    } catch (error) {
      console.error("Error notifying members:", error);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, [communityId, user]);

  // Realtime subscription
  useEffect(() => {
    if (!communityId) return;

    const channel = supabase
      .channel(`announcements-${communityId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "community_announcements",
          filter: `community_id=eq.${communityId}`,
        },
        () => {
          fetchAnnouncements();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [communityId]);

  return {
    announcements,
    isLoading,
    createAnnouncement,
    updateAnnouncement,
    deleteAnnouncement,
    refetch: fetchAnnouncements,
  };
};
