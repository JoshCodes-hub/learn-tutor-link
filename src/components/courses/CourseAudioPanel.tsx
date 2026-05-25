import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Headphones } from "lucide-react";

interface Props { courseId: string; courseCode: string; topicId?: string | null }

export const CourseAudioPanel = ({ courseId, courseCode, topicId }: Props) => {
  const { data: docs = [], isLoading } = useQuery({
    queryKey: ["course-audio-docs", courseId, topicId],
    enabled: !!courseId,
    queryFn: async () => {
      let q = supabase
        .from("lecture_notes")
        .select("id, title, file_type")
        .eq("course_id", courseId)
        .eq("is_published", true)
        .order("created_at", { ascending: false })
        .limit(40);
      if (topicId) q = q.eq("topic_id", topicId);
      const { data } = await q;
      return data ?? [];
    },
  });

  if (isLoading) return <p className="text-sm text-muted-foreground p-6 text-center">Loading…</p>;
  if (!docs.length) {
    return (
      <Card className="p-5 text-center">
        <Headphones className="w-7 h-7 text-amber-500 mx-auto mb-2" />
        <h3 className="font-semibold">Nothing to listen to yet</h3>
        <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
          When tutors upload PDFs or notes for {courseCode}, you can listen to them here using your device's built-in voice.
        </p>
      </Card>
    );
  }

  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {docs.map((d: any) => (
        <Card key={d.id} className="p-3 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-sky-500/10 text-sky-600 flex items-center justify-center shrink-0">
            <FileText className="w-4.5 h-4.5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold truncate">{d.title}</p>
            <p className="text-[11px] text-muted-foreground uppercase">{d.file_type || "doc"}</p>
          </div>
          <Button asChild size="sm" className="h-8 bg-amber-500 hover:bg-amber-600 text-white">
            <Link to={`/audio-learning?source=lecture_note:${d.id}`}>
              <Headphones className="w-3.5 h-3.5 mr-1.5" /> Listen
            </Link>
          </Button>
        </Card>
      ))}
    </div>
  );
};

export default CourseAudioPanel;