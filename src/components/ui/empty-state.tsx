import { ReactNode } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { LucideIcon } from "lucide-react";

type EmptyStateProps = {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick?: () => void;
    href?: string;
  };
  secondaryAction?: {
    label: string;
    onClick?: () => void;
    href?: string;
  };
  children?: ReactNode;
  variant?: "card" | "bare";
};

/**
 * Elegant empty-state component. Decent, professional, on-brand:
 * gold halo icon, serif headline, optional CTAs. Use whenever a list or
 * dashboard panel has no data instead of leaving blank space.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  secondaryAction,
  children,
  variant = "card",
}: EmptyStateProps) {
  const inner = (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="flex flex-col items-center text-center px-6 py-10"
    >
      <div className="relative mb-5">
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-amber-300/40 to-amber-500/20 blur-2xl" />
        <div className="relative h-16 w-16 rounded-2xl bg-gradient-to-br from-amber-50 to-amber-100/80 border border-amber-200 flex items-center justify-center shadow-sm">
          <Icon className="h-7 w-7 text-amber-700" strokeWidth={1.5} />
        </div>
      </div>

      <h3 className="font-serif text-xl font-semibold tracking-tight text-foreground mb-1.5">
        {title}
      </h3>
      {description && (
        <p className="text-sm text-muted-foreground max-w-sm leading-relaxed">
          {description}
        </p>
      )}

      {children && <div className="mt-4 w-full">{children}</div>}

      {(action || secondaryAction) && (
        <div className="mt-6 flex flex-wrap gap-2 justify-center">
          {action && (
            <Button
              onClick={action.onClick}
              {...(action.href ? { asChild: true } : {})}
              className="bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white shadow-md shadow-amber-500/20"
            >
              {action.href ? <a href={action.href}>{action.label}</a> : action.label}
            </Button>
          )}
          {secondaryAction && (
            <Button
              variant="outline"
              onClick={secondaryAction.onClick}
              {...(secondaryAction.href ? { asChild: true } : {})}
              className="border-amber-200 hover:bg-amber-50/50"
            >
              {secondaryAction.href ? (
                <a href={secondaryAction.href}>{secondaryAction.label}</a>
              ) : (
                secondaryAction.label
              )}
            </Button>
          )}
        </div>
      )}
    </motion.div>
  );

  if (variant === "bare") return inner;

  return (
    <Card className="border-amber-100/60 bg-gradient-to-br from-white to-amber-50/30 shadow-sm">
      {inner}
    </Card>
  );
}

export default EmptyState;
