import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Star, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface RateQuizDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quizId: string;
  quizTitle: string;
}

export function RateQuizDialog({
  open,
  onOpenChange,
  quizId,
  quizTitle,
}: RateQuizDialogProps) {
  const { user } = useAuth();
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [review, setReview] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [existingRating, setExistingRating] = useState<number | null>(null);

  useEffect(() => {
    const fetchExistingRating = async () => {
      if (!user || !quizId) return;

      const { data } = await supabase
        .from("quiz_ratings")
        .select("rating, review")
        .eq("quiz_id", quizId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (data) {
        setRating(data.rating);
        setReview(data.review || "");
        setExistingRating(data.rating);
      }
    };

    if (open) {
      fetchExistingRating();
    }
  }, [open, quizId, user]);

  const handleSubmit = async () => {
    if (!user || rating === 0) {
      toast.error("Please select a rating");
      return;
    }

    setIsLoading(true);

    try {
      if (existingRating) {
        // Update existing rating
        const { error } = await supabase
          .from("quiz_ratings")
          .update({ rating, review: review.trim() || null })
          .eq("quiz_id", quizId)
          .eq("user_id", user.id);

        if (error) throw error;
        toast.success("Rating updated!");
      } else {
        // Create new rating
        const { error } = await supabase
          .from("quiz_ratings")
          .insert({
            quiz_id: quizId,
            user_id: user.id,
            rating,
            review: review.trim() || null,
          });

        if (error) throw error;
        toast.success("Thanks for rating!");
      }

      onOpenChange(false);
    } catch (error: any) {
      console.error("Error submitting rating:", error);
      toast.error(error.message || "Failed to submit rating");
    } finally {
      setIsLoading(false);
    }
  };

  const displayRating = hoveredRating || rating;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Rate this Quiz</DialogTitle>
          <DialogDescription>
            How was your experience with "{quizTitle}"?
          </DialogDescription>
        </DialogHeader>

        <div className="py-6">
          {/* Star Rating */}
          <div className="flex justify-center gap-2 mb-6">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                onMouseEnter={() => setHoveredRating(star)}
                onMouseLeave={() => setHoveredRating(0)}
                className="transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded"
              >
                <Star
                  className={cn(
                    "w-10 h-10 transition-colors",
                    star <= displayRating
                      ? "fill-accent text-accent"
                      : "text-muted-foreground/30"
                  )}
                />
              </button>
            ))}
          </div>

          <p className="text-center text-sm text-muted-foreground mb-6">
            {displayRating === 1 && "Poor"}
            {displayRating === 2 && "Fair"}
            {displayRating === 3 && "Good"}
            {displayRating === 4 && "Very Good"}
            {displayRating === 5 && "Excellent!"}
            {displayRating === 0 && "Select a rating"}
          </p>

          {/* Optional Review */}
          <div className="space-y-2">
            <Label htmlFor="review">Review (optional)</Label>
            <Textarea
              id="review"
              placeholder="Share your thoughts about this quiz..."
              value={review}
              onChange={(e) => setReview(e.target.value)}
              rows={3}
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground text-right">
              {review.length}/500
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Skip
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading || rating === 0}>
            {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {existingRating ? "Update Rating" : "Submit Rating"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
