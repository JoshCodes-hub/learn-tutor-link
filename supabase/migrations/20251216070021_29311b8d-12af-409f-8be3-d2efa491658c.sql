-- Create team_messages table for chat
CREATE TABLE public.team_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.team_messages ENABLE ROW LEVEL SECURITY;

-- Policies for team_messages
CREATE POLICY "Team members can view their team messages"
ON public.team_messages FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM team_members 
    WHERE team_members.team_id = team_messages.team_id 
    AND team_members.user_id = auth.uid()
  )
);

CREATE POLICY "Team members can send messages"
ON public.team_messages FOR INSERT
WITH CHECK (
  auth.uid() = user_id AND
  EXISTS (
    SELECT 1 FROM team_members 
    WHERE team_members.team_id = team_messages.team_id 
    AND team_members.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete their own messages"
ON public.team_messages FOR DELETE
USING (auth.uid() = user_id);

-- Enable realtime for team messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.team_messages;

-- Add index for faster queries
CREATE INDEX idx_team_messages_team_id ON public.team_messages(team_id);
CREATE INDEX idx_team_messages_created_at ON public.team_messages(created_at DESC);