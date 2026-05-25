import { useMemo, useState } from "react";
import { useMySubscription } from "@/hooks/useSubscription";

export function usePremium() {
  const { data: sub, isLoading } = useMySubscription();
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [upgradeReason, setUpgradeReason] = useState<string | null>(null);

  const isPro = useMemo(() => {
    if (!sub) return false;
    if (sub.plan_id === "free") return false;
    if (sub.expires_at && new Date(sub.expires_at) <= new Date()) return false;
    return sub.status === "active";
  }, [sub]);

  const requirePremium = (reason: string): boolean => {
    if (isPro) return true;
    setUpgradeReason(reason);
    setUpgradeOpen(true);
    return false;
  };

  return {
    isPro,
    isLoading,
    plan: sub?.plan_id ?? "free",
    expiresAt: sub?.expires_at ?? null,
    upgradeOpen,
    upgradeReason,
    setUpgradeOpen,
    requirePremium,
  };
}
