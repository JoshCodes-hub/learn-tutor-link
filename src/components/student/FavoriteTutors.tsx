import { Link } from "react-router-dom";
import { useFavoriteTutorsList } from "@/hooks/useFavoriteTutors";
import TutorAvatar from "@/components/tutor/TutorAvatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Star, BookOpen, Heart, Loader2 } from "lucide-react";

const FavoriteTutors = () => {
  const { favorites, isLoading } = useFavoriteTutorsList();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="w-5 h-5 text-destructive" />
            Favorite Tutors
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (favorites.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="w-5 h-5 text-destructive" />
            Favorite Tutors
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Heart className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No favorite tutors yet</p>
            <p className="text-sm mt-1">Browse tutors and follow your favorites!</p>
            <Button variant="outline" size="sm" className="mt-4" asChild>
              <Link to="/tutors">Browse Tutors</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Heart className="w-5 h-5 text-destructive fill-destructive" />
          Favorite Tutors
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {favorites.slice(0, 5).map((tutor) => {
            return (
              <Link
                key={tutor.id}
                to={`/tutor/${tutor.id}`}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
              >
                <TutorAvatar
                  src={tutor.profile_image_url}
                  name={tutor.full_name}
                  className="h-10 w-10"
                  fallbackClassName="text-sm"
                />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground truncate">
                    {tutor.full_name || "Tutor"}
                  </p>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <BookOpen className="w-3 h-3" />
                      {tutor.quizCount} quizzes
                    </span>
                    {tutor.totalRatings > 0 && (
                      <span className="flex items-center gap-1">
                        <Star className="w-3 h-3 fill-accent text-accent" />
                        {tutor.avgRating.toFixed(1)}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
        {favorites.length > 5 && (
          <Button variant="ghost" size="sm" className="w-full mt-3" asChild>
            <Link to="/tutors">View All ({favorites.length})</Link>
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

export default FavoriteTutors;
