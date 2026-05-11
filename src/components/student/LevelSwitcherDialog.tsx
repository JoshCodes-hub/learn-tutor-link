import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { LEVEL_OPTIONS, useStudentLevel } from "@/hooks/useStudentLevel";
import { Check, GraduationCap } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}

export const LevelSwitcherDialog = ({ open, onOpenChange }: Props) => {
  const { level, setLevel } = useStudentLevel();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display">
            <GraduationCap className="w-5 h-5 text-amber-600" />
            Switch your level
          </DialogTitle>
          <DialogDescription>
            Pick the level you're studying. Courses, quizzes, and resources outside this level
            stay locked until you switch back.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-2 mt-2">
          {LEVEL_OPTIONS.map((opt) => {
            const active = level === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={async () => {
                  await setLevel(opt.value);
                  onOpenChange(false);
                }}
                className={cn(
                  "flex items-center justify-between rounded-xl border px-3 py-2.5 text-sm font-semibold transition active:scale-[0.98]",
                  active
                    ? "border-amber-500 bg-gradient-to-br from-amber-50 to-amber-100 text-amber-900"
                    : "border-amber-100 bg-white hover:border-amber-300 hover:bg-amber-50/60 text-foreground"
                )}
              >
                <span>{opt.label}</span>
                {active && <Check className="w-4 h-4 text-amber-600" />}
              </button>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default LevelSwitcherDialog;
