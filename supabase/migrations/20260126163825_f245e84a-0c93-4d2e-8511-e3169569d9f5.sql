-- Create community announcements table
CREATE TABLE public.community_announcements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  community_id UUID NOT NULL REFERENCES public.tutor_communities(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  is_pinned BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.community_announcements ENABLE ROW LEVEL SECURITY;

-- RLS Policies for announcements
CREATE POLICY "Community members can view announcements"
ON public.community_announcements
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM community_members
    WHERE community_members.community_id = community_announcements.community_id
    AND community_members.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM tutor_communities
    WHERE tutor_communities.id = community_announcements.community_id
    AND tutor_communities.tutor_id = auth.uid()
  )
);

CREATE POLICY "Tutors can create announcements"
ON public.community_announcements
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM tutor_communities
    WHERE tutor_communities.id = community_announcements.community_id
    AND tutor_communities.tutor_id = auth.uid()
  )
);

CREATE POLICY "Tutors can update their announcements"
ON public.community_announcements
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM tutor_communities
    WHERE tutor_communities.id = community_announcements.community_id
    AND tutor_communities.tutor_id = auth.uid()
  )
);

CREATE POLICY "Tutors can delete their announcements"
ON public.community_announcements
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM tutor_communities
    WHERE tutor_communities.id = community_announcements.community_id
    AND tutor_communities.tutor_id = auth.uid()
  )
);

-- Add trigger for updated_at
CREATE TRIGGER update_community_announcements_updated_at
BEFORE UPDATE ON public.community_announcements
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for announcements
ALTER PUBLICATION supabase_realtime ADD TABLE public.community_announcements;