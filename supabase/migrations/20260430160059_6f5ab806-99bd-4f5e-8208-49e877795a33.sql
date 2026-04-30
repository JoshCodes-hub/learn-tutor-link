-- =========================================================
-- Profile extensions: academic + personal fields
-- =========================================================
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS level TEXT,
  ADD COLUMN IF NOT EXISTS current_cgpa NUMERIC(3,2),
  ADD COLUMN IF NOT EXISTS aspiring_cgpa NUMERIC(3,2),
  ADD COLUMN IF NOT EXISTS matric_no TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS date_of_birth DATE,
  ADD COLUMN IF NOT EXISTS gender TEXT,
  ADD COLUMN IF NOT EXISTS bio TEXT,
  ADD COLUMN IF NOT EXISTS state_of_origin TEXT,
  ADD COLUMN IF NOT EXISTS linkedin_handle TEXT,
  ADD COLUMN IF NOT EXISTS x_handle TEXT,
  ADD COLUMN IF NOT EXISTS study_interests TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS hobbies TEXT[] DEFAULT '{}';

-- Allow authenticated users to view minimal public profile fields for community feed
CREATE POLICY "Public can view basic profile info"
ON public.profiles FOR SELECT
TO authenticated
USING (true);

-- =========================================================
-- Course extensions: level + tutor self-pick
-- =========================================================
ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS level TEXT;

CREATE TABLE IF NOT EXISTS public.tutor_courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tutor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tutor_id, course_id)
);
CREATE INDEX IF NOT EXISTS idx_tutor_courses_tutor ON public.tutor_courses(tutor_id);
CREATE INDEX IF NOT EXISTS idx_tutor_courses_course ON public.tutor_courses(course_id);
ALTER TABLE public.tutor_courses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view tutor course assignments"
ON public.tutor_courses FOR SELECT TO authenticated USING (true);

CREATE POLICY "Tutors manage their own course list"
ON public.tutor_courses FOR ALL TO authenticated
USING (tutor_id = auth.uid() AND public.has_role(auth.uid(), 'tutor'::app_role))
WITH CHECK (tutor_id = auth.uid() AND public.has_role(auth.uid(), 'tutor'::app_role));

CREATE POLICY "Admins manage all tutor courses"
ON public.tutor_courses FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- =========================================================
-- Student enrollments: my_courses
-- =========================================================
CREATE TABLE IF NOT EXISTS public.student_courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (student_id, course_id)
);
CREATE INDEX IF NOT EXISTS idx_student_courses_student ON public.student_courses(student_id);
CREATE INDEX IF NOT EXISTS idx_student_courses_course ON public.student_courses(course_id);
ALTER TABLE public.student_courses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students view their own enrollments"
ON public.student_courses FOR SELECT TO authenticated
USING (student_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Students enroll themselves"
ON public.student_courses FOR INSERT TO authenticated
WITH CHECK (student_id = auth.uid());

CREATE POLICY "Students unenroll themselves"
ON public.student_courses FOR DELETE TO authenticated
USING (student_id = auth.uid());

-- =========================================================
-- Community: posts + comments + likes (global + per-course channels)
-- channel_type: 'global' or 'course'; course_id required when 'course'
-- =========================================================
CREATE TABLE IF NOT EXISTS public.community_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  channel_type TEXT NOT NULL DEFAULT 'global' CHECK (channel_type IN ('global','course')),
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  image_url TEXT,
  like_count INTEGER NOT NULL DEFAULT 0,
  comment_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (channel_type = 'global' OR course_id IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS idx_posts_channel ON public.community_posts(channel_type, course_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_author ON public.community_posts(author_id);
ALTER TABLE public.community_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view all posts"
ON public.community_posts FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated can create posts"
ON public.community_posts FOR INSERT TO authenticated
WITH CHECK (author_id = auth.uid());

CREATE POLICY "Authors update own posts"
ON public.community_posts FOR UPDATE TO authenticated
USING (author_id = auth.uid());

CREATE POLICY "Authors or admins delete posts"
ON public.community_posts FOR DELETE TO authenticated
USING (author_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_community_posts_updated_at
BEFORE UPDATE ON public.community_posts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.community_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_comments_post ON public.community_comments(post_id, created_at);
ALTER TABLE public.community_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated view comments"
ON public.community_comments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated comment"
ON public.community_comments FOR INSERT TO authenticated
WITH CHECK (author_id = auth.uid());
CREATE POLICY "Authors delete own comments"
ON public.community_comments FOR DELETE TO authenticated
USING (author_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE TABLE IF NOT EXISTS public.community_likes (
  post_id UUID NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (post_id, user_id)
);
ALTER TABLE public.community_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View likes" ON public.community_likes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Like as self" ON public.community_likes FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Unlike own" ON public.community_likes FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Counters via triggers
CREATE OR REPLACE FUNCTION public.bump_post_like_count()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.community_posts SET like_count = like_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.community_posts SET like_count = GREATEST(like_count - 1, 0) WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END $$;

CREATE TRIGGER trg_likes_count
AFTER INSERT OR DELETE ON public.community_likes
FOR EACH ROW EXECUTE FUNCTION public.bump_post_like_count();

CREATE OR REPLACE FUNCTION public.bump_post_comment_count()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.community_posts SET comment_count = comment_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.community_posts SET comment_count = GREATEST(comment_count - 1, 0) WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END $$;

CREATE TRIGGER trg_comments_count
AFTER INSERT OR DELETE ON public.community_comments
FOR EACH ROW EXECUTE FUNCTION public.bump_post_comment_count();

-- Realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.community_posts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.community_comments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.community_likes;

-- =========================================================
-- Storage: community-media bucket (images for posts) + avatars bucket
-- =========================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('community-media', 'community-media', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Community media public read"
ON storage.objects FOR SELECT USING (bucket_id = 'community-media');
CREATE POLICY "Authenticated upload community media"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'community-media' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Owners delete community media"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'community-media' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Avatars public read"
ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "Authenticated upload avatar"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Owners update avatar"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Owners delete avatar"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);