import { GraduationCap, Shield, User as UserIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type IntendedRole = "student" | "tutor" | "admin";

const OPTIONS: {
  id: IntendedRole;
  label: string;
  description: string;
  Icon: typeof UserIcon;
}[] = [
  {
    id: "student",
    label: "Student",
    description: "Learn, practice, and track progress.",
    Icon: UserIcon,
  },
  {
    id: "tutor",
    label: "Tutor",
    description: "Create quizzes, courses, and earn.",
    Icon: GraduationCap,
  },
  {
    id: "admin",
    label: "Admin",
    description: "Moderate content and manage users.",
    Icon: Shield,
  },
];

/**
 * Three-card role picker. Used on the Auth page (intended role for the
 * sign-in attempt) and on the Dashboard (jump to that role's home).
 * Defaults to "student" — never silently elevates privileges.
 */
export const RoleSelectionCards = ({
  value,
  onChange,
  size = "md",
}: {
  value: IntendedRole;
  onChange: (role: IntendedRole) => void;
  size?: "sm" | "md";
}) => {
  return (
    <div
      className={cn(
        "grid grid-cols-3 gap-2",
        size === "md" && "sm:gap-3"
      )}
      role="radiogroup"
      aria-label="Select role"
    >
      {OPTIONS.map(({ id, label, description, Icon }) => {
        const active = value === id;
        return (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(id)}
            className={cn(
              "rounded-xl border text-left transition-all",
              size === "md" ? "p-3" : "p-2",
              active
                ? "border-primary bg-primary/5 shadow-sm ring-1 ring-primary/30"
                : "border-border bg-card hover:border-primary/40"
            )}
          >
            <Icon
              className={cn(
                "mb-1",
                size === "md" ? "w-5 h-5" : "w-4 h-4",
                active ? "text-primary" : "text-muted-foreground"
              )}
            />
            <div className={cn("font-semibold", size === "md" ? "text-sm" : "text-xs")}>
              {label}
            </div>
            {size === "md" && (
              <div className="text-[11px] text-muted-foreground mt-0.5 leading-tight">
                {description}
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
};

export default RoleSelectionCards;