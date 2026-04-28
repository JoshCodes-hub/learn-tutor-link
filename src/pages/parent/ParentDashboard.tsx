import AppScreen from "@/components/app-shell/AppScreen";
import AppListItem from "@/components/app-shell/AppListItem";
import { ClipboardCheck, FileText, Wallet, Megaphone } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function ParentDashboard() {
  const navigate = useNavigate();
  const items = [
    { icon: ClipboardCheck, title: "Attendance", subtitle: "See your child's attendance", to: "/school/attendance" },
    { icon: FileText, title: "Results", subtitle: "Latest scores and grades", to: "/school/results" },
    { icon: Wallet, title: "Fees", subtitle: "Outstanding & paid fees", to: "/school/fees" },
    { icon: Megaphone, title: "School notices", subtitle: "Announcements from school", to: "/school/announcements" },
  ];
  return (
    <AppScreen title="Parent" subtitle="Your child at a glance">
      <div className="max-w-lg mx-auto space-y-2">
        {items.map((it) => (
          <AppListItem key={it.to} icon={it.icon} title={it.title} subtitle={it.subtitle} onClick={() => navigate(it.to)} />
        ))}
      </div>
    </AppScreen>
  );
}
