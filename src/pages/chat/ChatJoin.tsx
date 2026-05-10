import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { joinBrainstormByCode } from "@/hooks/useChatThreads";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function ChatJoin() {
  const { code } = useParams<{ code: string }>();
  const { user, isLoading: loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate(`/auth?redirect=/chat/join/${code}`);
      return;
    }
    if (!code) return;
    joinBrainstormByCode(code)
      .then(id => navigate(`/chat/${id}`, { replace: true }))
      .catch(e => {
        toast.error(e.message || "Invalid code");
        navigate("/chat", { replace: true });
      });
  }, [code, user, loading, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="w-6 h-6 animate-spin text-primary" />
    </div>
  );
}
