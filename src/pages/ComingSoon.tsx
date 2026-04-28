import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import AppScreen from "@/components/app-shell/AppScreen";

const ComingSoon = ({ title = "Coming soon", note }: { title?: string; note?: string }) => {
  const navigate = useNavigate();
  return (
    <AppScreen title={title} back>
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-5">
          <Sparkles className="w-9 h-9 text-primary" />
        </div>
        <h2 className="font-display text-2xl font-bold mb-2">We're almost there</h2>
        <p className="text-muted-foreground max-w-sm mb-6">
          {note ?? "This area is paused while we polish it. We'll notify you as soon as it's live."}
        </p>
        <Button onClick={() => navigate("/")}>Back home</Button>
      </div>
    </AppScreen>
  );
};

export default ComingSoon;
