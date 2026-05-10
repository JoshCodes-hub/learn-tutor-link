import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { MessageCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export function MessageUserButton({ userId, label = 'Message', className }: { userId: string; label?: string; className?: string }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  if (!user || user.id === userId) return null;

  const start = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('start_dm', { _other_user: userId });
      if (error) throw error;
      navigate(`/chat/${data}`);
    } catch (e: any) {
      toast.error(e?.message ?? 'Could not start chat');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button size="sm" variant="outline" onClick={start} disabled={loading} className={className}>
      {loading ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <MessageCircle className="w-4 h-4 mr-1" />}
      {label}
    </Button>
  );
}
