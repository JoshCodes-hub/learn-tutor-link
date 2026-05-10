import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, ArrowLeft, AlertCircle, Users, MessageSquare, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  LiveKitRoom, VideoConference, RoomAudioRenderer, Chat,
} from '@livekit/components-react';
import '@livekit/components-styles';
import ParticipantRoster from '@/components/live/ParticipantRoster';
import LiveRecorder from '@/components/live/LiveRecorder';
import ClassRecapPanel from '@/components/live/ClassRecapPanel';

interface TokenResponse {
  token: string; url: string; room: string; identity: string; isHost: boolean; title: string;
}

type Panel = 'roster' | 'chat' | 'recap' | null;

export default function LiveRoom() {
  const { slotId } = useParams<{ slotId: string }>();
  const nav = useNavigate();
  const [data, setData] = useState<TokenResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [panel, setPanel] = useState<Panel>('roster');

  useEffect(() => {
    if (!slotId) return;
    (async () => {
      const { data: res, error } = await supabase.functions.invoke('livekit-token', {
        body: { slot_id: slotId },
      });
      if (error || (res as any)?.error) {
        setError((res as any)?.error ?? error?.message ?? 'Could not join');
      } else setData(res as TokenResponse);
    })();
  }, [slotId]);

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 text-center">
        <AlertCircle className="w-10 h-10 text-destructive mb-2" />
        <p className="font-semibold">Cannot join session</p>
        <p className="text-sm text-muted-foreground mb-4">{error}</p>
        <Button onClick={() => nav('/sessions')}>Back to sessions</Button>
      </div>
    );
  }
  if (!data || !slotId) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="h-screen w-screen flex flex-col bg-background">
      <header className="flex items-center gap-2 px-3 py-2 border-b shrink-0">
        <Button variant="ghost" size="icon" onClick={() => nav(-1)}><ArrowLeft className="w-5 h-5" /></Button>
        <h1 className="text-sm font-semibold flex-1 truncate">{data.title} {data.isHost && <span className="text-xs text-primary">· Host</span>}</h1>
        {data.isHost && <LiveRecorder slotId={slotId} />}
        <Button variant={panel === 'roster' ? 'secondary' : 'ghost'} size="icon" onClick={() => setPanel(panel === 'roster' ? null : 'roster')} title="Participants">
          <Users className="w-5 h-5" />
        </Button>
        <Button variant={panel === 'chat' ? 'secondary' : 'ghost'} size="icon" onClick={() => setPanel(panel === 'chat' ? null : 'chat')} title="Chat">
          <MessageSquare className="w-5 h-5" />
        </Button>
        {data.isHost && (
          <Button variant={panel === 'recap' ? 'secondary' : 'ghost'} size="icon" onClick={() => setPanel(panel === 'recap' ? null : 'recap')} title="AI Recap">
            <Sparkles className="w-5 h-5" />
          </Button>
        )}
      </header>
      <div className="flex-1 min-h-0">
        <LiveKitRoom
          token={data.token}
          serverUrl={data.url}
          connect
          video
          audio
          data-lk-theme="default"
          style={{ height: '100%' }}
          onDisconnected={() => nav('/sessions')}
        >
          <div className="flex h-full w-full">
            <div className="flex-1 min-w-0">
              <VideoConference />
            </div>
            {panel === 'roster' && <ParticipantRoster slotId={slotId} isHost={data.isHost} />}
            {panel === 'chat' && (
              <aside className="w-72 shrink-0 border-l bg-card flex flex-col h-full">
                <div className="px-3 py-2 border-b flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-primary" />
                  <h2 className="text-sm font-semibold">In-room chat</h2>
                </div>
                <div className="flex-1 min-h-0">
                  <Chat style={{ height: '100%' }} />
                </div>
              </aside>
            )}
          </div>
          <RoomAudioRenderer />
        </LiveKitRoom>
      </div>
            {panel === 'recap' && (
              <aside className="w-80 shrink-0 border-l bg-card flex flex-col h-full overflow-y-auto p-3">
                <ClassRecapPanel slotId={slotId} />
              </aside>
            )}
          </div>
  );
}
