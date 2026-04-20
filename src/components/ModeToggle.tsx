import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { BookOpen, PenLine } from "lucide-react";

interface Props {
  value: "cbt" | "theory";
  onChange: (v: "cbt" | "theory") => void;
}

export const ModeToggle = ({ value, onChange }: Props) => {
  return (
    <ToggleGroup
      type="single"
      value={value}
      onValueChange={(v) => v && onChange(v as "cbt" | "theory")}
      className="border border-border/50 rounded-lg p-1 bg-card/60"
    >
      <ToggleGroupItem value="cbt" className="gap-1.5 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
        <BookOpen className="w-4 h-4" /> CBT
      </ToggleGroupItem>
      <ToggleGroupItem value="theory" className="gap-1.5 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
        <PenLine className="w-4 h-4" /> Theory
      </ToggleGroupItem>
    </ToggleGroup>
  );
};
