import { Crown } from "lucide-react";

export const PremiumBadge = ({ className = "" }: { className?: string }) => (
  <span
    className={`inline-flex items-center gap-1 px-2 h-5 rounded-full bg-gradient-to-r from-amber-400 to-amber-500 text-white text-[10px] font-bold uppercase tracking-wider shadow-sm ${className}`}
  >
    <Crown className="w-2.5 h-2.5" /> Pro
  </span>
);

export default PremiumBadge;
