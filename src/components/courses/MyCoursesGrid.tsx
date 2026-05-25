import { useCourseSnapshots } from "@/hooks/useCourseSnapshots";
import { CourseCard } from "@/components/courses/CourseCard";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { BookOpen } from "lucide-react";

interface Props {
  emptyMessage?: string;
}

export function MyCoursesGrid({ emptyMessage }: Props) {
  const { data = [], isLoading } = useCourseSnapshots();

  if (isLoading) {
    return (
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-44 rounded-2xl" />
        ))}
      </div>
    );
  }

  if (!data.length) {
    return (
      <Card className="p-10 text-center text-muted-foreground">
        <BookOpen className="w-8 h-8 mx-auto mb-3 text-amber-500" />
        <p className="text-sm">{emptyMessage || "You haven't added any courses yet."}</p>
      </Card>
    );
  }

  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {data.map((c) => (
        <CourseCard key={c.id} course={c} />
      ))}
    </div>
  );
}

export default MyCoursesGrid;