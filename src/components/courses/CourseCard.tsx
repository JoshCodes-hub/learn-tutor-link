import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  BookOpen, Headphones, Brain, FileQuestion, FolderOpen, PlayCircle,
} from "lucide-react";
import type { CourseSnapshot } from "@/hooks/useCourseSnapshots";

interface Props {
  course: CourseSnapshot;
}

const ACTIONS = [
  { key: "open",     label: "Open",       icon: BookOpen,     to: (id: string) => `/courses/${id}` },
  { key: "continue", label: "Continue",   icon: PlayCircle,   to: (id: string) => `/courses/${id}?tab=materials` },
  { key: "audio",    label: "Audio",      icon: Headphones,   to: (id: string) => `/courses/${id}?tab=audio` },
  { key: "cards",    label: "Flashcards", icon: Brain,        to: (id: string) => `/courses/${id}?tab=flashcards` },
  { key: "quiz",     label: "Quiz",       icon: FileQuestion, to: (id: string) => `/courses/${id}?tab=quizzes` },
  { key: "res",      label: "Resources",  icon: FolderOpen,   to: (id: string) => `/courses/${id}?tab=materials` },
] as const;

export function CourseCard({ course }: Props) {
  const unread = course.unread_updates || 0;
  return (
    <Card className="group relative overflow-hidden border-amber-100/70 bg-white hover:shadow-elegant transition-all">
      <Link to={`/courses/${course.id}`} className="block p-5 pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <Badge variant="outline" className="mb-2 border-amber-300 text-amber-700 bg-amber-50">
              {course.code}
            </Badge>
            <h3 className="font-display font-semibold leading-tight truncate text-base">
              {course.name}
            </h3>
            <p className="text-xs text-muted-foreground mt-1 truncate">
              {course.level ? `${course.level} Level` : ""}
              {course.level && course.department ? " · " : ""}
              {course.department || ""}
            </p>
          </div>
          {unread > 0 && (
            <span className="shrink-0 inline-flex items-center justify-center min-w-6 h-6 px-2 rounded-full bg-amber-500 text-white text-[11px] font-bold">
              {unread}
            </span>
          )}
        </div>
      </Link>
      <div className="px-3 pb-3 pt-1 grid grid-cols-3 gap-1.5">
        {ACTIONS.map((a) => {
          const Icon = a.icon;
          return (
            <Button
              key={a.key}
              asChild
              variant="ghost"
              size="sm"
              className="h-12 flex-col gap-1 rounded-lg text-[10.5px] font-medium text-muted-foreground hover:text-amber-700 hover:bg-amber-50/60"
            >
              <Link to={a.to(course.id)}>
                <Icon className="w-4 h-4 text-amber-600" />
                {a.label}
              </Link>
            </Button>
          );
        })}
      </div>
    </Card>
  );
}

export default CourseCard;