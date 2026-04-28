import { ReactNode } from "react";
import { ChevronRight, LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface AppListItemProps {
  icon?: LucideIcon;
  title: string;
  subtitle?: string;
  right?: ReactNode;
  onClick?: () => void;
  iconTint?: string; // tailwind class e.g. "bg-primary/10 text-primary"
  className?: string;
}

export const AppListItem = ({ icon: Icon, title, subtitle, right, onClick, iconTint = "bg-primary/10 text-primary", className }: AppListItemProps) => {
  const Comp: any = onClick ? "button" : "div";
  return (
    <Comp
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 p-3 rounded-2xl bg-card border border-border/50 text-left",
        onClick && "hover:border-primary/40 hover:shadow-sm active:scale-[0.98] transition-all",
        className
      )}
    >
      {Icon && (
        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", iconTint)}>
          <Icon className="w-5 h-5" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="font-medium text-sm truncate">{title}</div>
        {subtitle && <div className="text-xs text-muted-foreground truncate">{subtitle}</div>}
      </div>
      {right ?? (onClick && <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />)}
    </Comp>
  );
};

export default AppListItem;
