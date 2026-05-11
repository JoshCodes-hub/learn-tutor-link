import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LEVEL_OPTIONS } from "@/hooks/useStudentLevel";

export const TUTOR_LEVEL_OPTIONS = [
  { value: "ALL", label: "All Levels" },
  ...LEVEL_OPTIONS,
];

interface LevelSelectProps {
  value: string;
  onChange: (v: string) => void;
  label?: string;
  required?: boolean;
  hideLabel?: boolean;
  placeholder?: string;
  className?: string;
  includeAll?: boolean;
  size?: "sm" | "default";
}

/**
 * Shared tutor-side level picker for content (course / quiz / curriculum / lecture note).
 * "ALL" means no level restriction (visible to all students regardless of level).
 */
export function LevelSelect({
  value,
  onChange,
  label = "Student Level",
  required,
  hideLabel,
  placeholder = "Select level",
  className,
  includeAll = true,
  size = "default",
}: LevelSelectProps) {
  const options = includeAll ? TUTOR_LEVEL_OPTIONS : LEVEL_OPTIONS;
  return (
    <div className={className ?? "space-y-2"}>
      {!hideLabel && (
        <Label>
          {label} {required && <span className="text-destructive">*</span>}
        </Label>
      )}
      <Select value={value || ""} onValueChange={onChange}>
        <SelectTrigger className={size === "sm" ? "h-9" : undefined}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

/** Convert "ALL" sentinel to null for DB storage. */
export const levelToDb = (v: string | null | undefined): string | null =>
  !v || v === "ALL" ? null : v;

/** Convert nullable DB value to UI sentinel. */
export const levelFromDb = (v: string | null | undefined): string => v || "ALL";

export const formatLevelLabel = (v: string | null | undefined): string => {
  if (!v) return "All Levels";
  const opt = LEVEL_OPTIONS.find((o) => o.value === v);
  return opt ? opt.label : v;
};