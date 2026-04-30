import { MouseEvent } from "react";
import { Heart, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFavoriteTutors } from "@/hooks/useFavoriteTutors";
import { cn } from "@/lib/utils";

interface FollowTutorButtonProps {
  tutorId: string;
  size?: "sm" | "default";
  variant?: "default" | "compact";
  className?: string;
}

/**
 * Inline follow/unfollow button. Designed to live inside tutor cards
 * (which are usually wrapped in a <Link>), so it stops propagation.
 */
export const FollowTutorButton = ({
  tutorId,
  size = "sm",
  variant = "default",
  className,
}: FollowTutorButtonProps) => {
  const { isFavorite, isLoading, toggleFavorite } = useFavoriteTutors(tutorId);

  const handleClick = (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    toggleFavorite();
  };

  if (variant === "compact") {
    return (
      <button
        type="button"
        onClick={handleClick}
        disabled={isLoading}
        aria-label={isFavorite ? "Unfollow tutor" : "Follow tutor"}
        className={cn(
          "w-9 h-9 rounded-full flex items-center justify-center border transition-all",
          isFavorite
            ? "bg-primary/10 border-primary text-primary"
            : "bg-card border-border text-muted-foreground hover:border-primary/40 hover:text-primary",
          className,
        )}
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Heart className={cn("w-4 h-4 transition-transform", isFavorite && "fill-current scale-110")} />
        )}
      </button>
    );
  }

  return (
    <Button
      type="button"
      size={size}
      variant={isFavorite ? "secondary" : "default"}
      onClick={handleClick}
      disabled={isLoading}
      className={cn("gap-1.5", className)}
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <Heart className={cn("w-4 h-4", isFavorite && "fill-current")} />
      )}
      {isFavorite ? "Following" : "Follow"}
    </Button>
  );
};

export default FollowTutorButton;
