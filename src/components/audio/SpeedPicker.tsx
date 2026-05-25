import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Props {
  value: number;
  onChange: (v: number) => void;
  options?: number[];
  className?: string;
}

const DEFAULT = [0.75, 1, 1.25, 1.5, 2];

export function SpeedPicker({ value, onChange, options = DEFAULT, className }: Props) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 rounded-full bg-amber-50/80 border border-amber-200 p-1",
        className,
      )}
      role="radiogroup"
      aria-label="Playback speed"
    >
      {options.map((opt) => {
        const active = Math.abs(value - opt) < 0.01;
        return (
          <Button
            key={opt}
            type="button"
            size="sm"
            variant="ghost"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(opt)}
            className={cn(
              "h-7 px-3 rounded-full text-[11px] font-semibold transition-colors",
              active
                ? "bg-amber-500 text-white hover:bg-amber-500 hover:text-white"
                : "text-amber-700 hover:bg-amber-100",
            )}
          >
            {opt}×
          </Button>
        );
      })}
    </div>
  );
}

export default SpeedPicker;