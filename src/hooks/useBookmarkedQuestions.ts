import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

interface BookmarkedQuestion {
  id: string;
  question_id: string;
  notes: string | null;
  created_at: string;
}

export const useBookmarkedQuestions = () => {
  const { user } = useAuth();
  const [bookmarks, setBookmarks] = useState<BookmarkedQuestion[]>([]);
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);

  const fetchBookmarks = useCallback(async () => {
    if (!user) {
      setBookmarks([]);
      setBookmarkedIds(new Set());
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("bookmarked_questions")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      setBookmarks(data || []);
      setBookmarkedIds(new Set((data || []).map((b) => b.question_id)));
    } catch (error) {
      console.error("Error fetching bookmarks:", error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchBookmarks();
  }, [fetchBookmarks]);

  const toggleBookmark = useCallback(
    async (questionId: string, notes?: string) => {
      if (!user) {
        toast.error("Please sign in to bookmark questions");
        return;
      }

      const isCurrentlyBookmarked = bookmarkedIds.has(questionId);

      try {
        if (isCurrentlyBookmarked) {
          // Remove bookmark
          const { error } = await supabase
            .from("bookmarked_questions")
            .delete()
            .eq("user_id", user.id)
            .eq("question_id", questionId);

          if (error) throw error;

          setBookmarkedIds((prev) => {
            const newSet = new Set(prev);
            newSet.delete(questionId);
            return newSet;
          });
          setBookmarks((prev) => prev.filter((b) => b.question_id !== questionId));
          toast.success("Bookmark removed");
        } else {
          // Add bookmark
          const { data, error } = await supabase
            .from("bookmarked_questions")
            .insert({
              user_id: user.id,
              question_id: questionId,
              notes: notes || null,
            })
            .select()
            .single();

          if (error) throw error;

          setBookmarkedIds((prev) => new Set(prev).add(questionId));
          setBookmarks((prev) => [data, ...prev]);
          toast.success("Question bookmarked for review");
        }
      } catch (error: any) {
        console.error("Error toggling bookmark:", error);
        toast.error("Failed to update bookmark");
      }
    },
    [user, bookmarkedIds]
  );

  const updateBookmarkNotes = useCallback(
    async (questionId: string, notes: string) => {
      if (!user) return;

      try {
        const { error } = await supabase
          .from("bookmarked_questions")
          .update({ notes })
          .eq("user_id", user.id)
          .eq("question_id", questionId);

        if (error) throw error;

        setBookmarks((prev) =>
          prev.map((b) =>
            b.question_id === questionId ? { ...b, notes } : b
          )
        );
        toast.success("Notes updated");
      } catch (error) {
        console.error("Error updating notes:", error);
        toast.error("Failed to update notes");
      }
    },
    [user]
  );

  const isBookmarked = useCallback(
    (questionId: string) => bookmarkedIds.has(questionId),
    [bookmarkedIds]
  );

  return {
    bookmarks,
    bookmarkedIds,
    isLoading,
    toggleBookmark,
    updateBookmarkNotes,
    isBookmarked,
    refetch: fetchBookmarks,
  };
};
