import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

export const useFavoriteTutors = (tutorId?: string) => {
  const { user } = useAuth();
  const [isFavorite, setIsFavorite] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);

  useEffect(() => {
    if (!tutorId) return;

    const checkFavorite = async () => {
      if (user) {
        const { data } = await supabase
          .from("favorite_tutors")
          .select("id")
          .eq("student_id", user.id)
          .eq("tutor_id", tutorId)
          .maybeSingle();
        
        setIsFavorite(!!data);
      }

      // Get follower count
      const { count } = await supabase
        .from("favorite_tutors")
        .select("*", { count: "exact", head: true })
        .eq("tutor_id", tutorId);
      
      setFollowerCount(count || 0);
    };

    checkFavorite();
  }, [tutorId, user]);

  const toggleFavorite = async () => {
    if (!user) {
      toast.error("Please sign in to follow tutors");
      return;
    }

    if (!tutorId) return;

    setIsLoading(true);
    try {
      if (isFavorite) {
        const { error } = await supabase
          .from("favorite_tutors")
          .delete()
          .eq("student_id", user.id)
          .eq("tutor_id", tutorId);

        if (error) throw error;
        setIsFavorite(false);
        setFollowerCount((prev) => Math.max(0, prev - 1));
        toast.success("Unfollowed tutor");
      } else {
        const { error } = await supabase
          .from("favorite_tutors")
          .insert({ student_id: user.id, tutor_id: tutorId });

        if (error) throw error;
        setIsFavorite(true);
        setFollowerCount((prev) => prev + 1);
        toast.success("Following tutor!");
      }
    } catch (error) {
      console.error("Error toggling favorite:", error);
      toast.error("Failed to update favorite");
    } finally {
      setIsLoading(false);
    }
  };

  return { isFavorite, isLoading, followerCount, toggleFavorite };
};

export const useFavoriteTutorsList = () => {
  const { user } = useAuth();
  const [favorites, setFavorites] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchFavorites = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }

      try {
        const { data: favoriteData } = await supabase
          .from("favorite_tutors")
          .select("tutor_id, created_at")
          .eq("student_id", user.id)
          .order("created_at", { ascending: false });

        if (!favoriteData || favoriteData.length === 0) {
          setFavorites([]);
          setIsLoading(false);
          return;
        }

        const tutorIds = favoriteData.map((f) => f.tutor_id);

        // Fetch tutor profiles
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name, profile_image_url, department, tutor_code")
          .in("id", tutorIds);

        // Fetch quiz counts and ratings for each tutor
        const tutorsWithStats = await Promise.all(
          (profiles || []).map(async (profile) => {
            const { count: quizCount } = await supabase
              .from("quizzes")
              .select("*", { count: "exact", head: true })
              .eq("tutor_id", profile.id)
              .eq("is_active", true);

            const { data: quizzes } = await supabase
              .from("quizzes")
              .select("id")
              .eq("tutor_id", profile.id);

            let avgRating = 0;
            let totalRatings = 0;

            if (quizzes && quizzes.length > 0) {
              const quizIds = quizzes.map((q) => q.id);
              const { data: ratings } = await supabase
                .from("quiz_ratings")
                .select("rating")
                .in("quiz_id", quizIds);

              if (ratings && ratings.length > 0) {
                totalRatings = ratings.length;
                avgRating = ratings.reduce((acc, r) => acc + r.rating, 0) / totalRatings;
              }
            }

            return {
              ...profile,
              quizCount: quizCount || 0,
              avgRating,
              totalRatings,
            };
          })
        );

        setFavorites(tutorsWithStats);
      } catch (error) {
        console.error("Error fetching favorites:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchFavorites();
  }, [user]);

  return { favorites, isLoading };
};
