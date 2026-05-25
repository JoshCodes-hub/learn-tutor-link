import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface Props {
  courseId: string;
  value: string | null;
  onChange: (topicId: string | null) => void;
}

export default function CourseTopicsStrip({ courseId, value, onChange }: Props) {
  const { data: topics = [] } = useQuery({
    queryKey: ["course-topics", courseId],
    enabled: !!courseId,
    queryFn: async () => {
      const { data } = await supabase
        .from("topics")
        .select("id, name, order_index")
        .eq("course_id", courseId)
        .order("order_index", { ascending: true });
      return data ?? [];
    },
  });

  if (!topics.length) return null;

  const Chip = ({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) => (
    <button
      onClick={onClick}
      className={cn(
        "shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors",
        active
          ? "bg-amber-500 text-white border-amber-500"
          : "bg-white text-foreground border-amber-100 hover:border-amber-300",
      )}
    >
      {children}
    </button>
  );

  return (
    <div className="-mx-4 px-4 mb-4 overflow-x-auto">
      <div className="flex gap-1.5">
        <Chip active={value === null} onClick={() => onChange(null)}>All topics</Chip>
        {topics.map((t: any) => (
          <Chip key={t.id} active={value === t.id} onClick={() => onChange(t.id)}>
            {t.name}
          </Chip>
        ))}
      </div>
    </div>
  );
}