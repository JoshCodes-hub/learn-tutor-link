
-- Notify enrolled students when a new quiz is added to a course
CREATE OR REPLACE FUNCTION public.notify_new_course_quiz()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_course_name text;
  v_course_code text;
BEGIN
  IF NEW.is_active IS DISTINCT FROM true OR NEW.course_id IS NULL THEN
    RETURN NEW;
  END IF;
  SELECT name, code INTO v_course_name, v_course_code FROM public.courses WHERE id = NEW.course_id;
  IF v_course_name IS NULL THEN RETURN NEW; END IF;

  INSERT INTO public.notifications (user_id, title, message, type, link)
  SELECT sc.student_id,
         'New quiz in ' || COALESCE(v_course_code, v_course_name),
         COALESCE(NEW.title, 'A new quiz') || ' is now available.',
         'info',
         '/courses/' || NEW.course_id::text
    FROM public.student_courses sc
   WHERE sc.course_id = NEW.course_id
     AND sc.student_id <> COALESCE(NEW.tutor_id, '00000000-0000-0000-0000-000000000000'::uuid);
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_notify_new_course_quiz ON public.quizzes;
CREATE TRIGGER trg_notify_new_course_quiz
AFTER INSERT ON public.quizzes
FOR EACH ROW EXECUTE FUNCTION public.notify_new_course_quiz();

-- Notify enrolled students when a tutor publishes a new lecture note
CREATE OR REPLACE FUNCTION public.notify_new_lecture_note()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_course_code text; v_course_name text;
BEGIN
  IF NEW.course_id IS NULL THEN RETURN NEW; END IF;
  IF NEW.is_published IS DISTINCT FROM true THEN RETURN NEW; END IF;
  SELECT code, name INTO v_course_code, v_course_name FROM public.courses WHERE id = NEW.course_id;
  IF v_course_code IS NULL AND v_course_name IS NULL THEN RETURN NEW; END IF;

  INSERT INTO public.notifications (user_id, title, message, type, link)
  SELECT sc.student_id,
         'New material in ' || COALESCE(v_course_code, v_course_name),
         COALESCE(NEW.title, 'A new lecture note') || ' was uploaded.',
         'info',
         '/courses/' || NEW.course_id::text
    FROM public.student_courses sc
   WHERE sc.course_id = NEW.course_id
     AND sc.student_id <> COALESCE(NEW.tutor_id, '00000000-0000-0000-0000-000000000000'::uuid);
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_notify_new_lecture_note ON public.lecture_notes;
CREATE TRIGGER trg_notify_new_lecture_note
AFTER INSERT ON public.lecture_notes
FOR EACH ROW EXECUTE FUNCTION public.notify_new_lecture_note();

-- Notify enrolled students when a course image/material is added
CREATE OR REPLACE FUNCTION public.notify_new_course_image()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_course_code text; v_course_name text;
BEGIN
  IF NEW.course_id IS NULL THEN RETURN NEW; END IF;
  SELECT code, name INTO v_course_code, v_course_name FROM public.courses WHERE id = NEW.course_id;

  INSERT INTO public.notifications (user_id, title, message, type, link)
  SELECT sc.student_id,
         'New material in ' || COALESCE(v_course_code, v_course_name, 'your course'),
         COALESCE(NEW.caption, 'A new image/material') || ' was added.',
         'info',
         '/courses/' || NEW.course_id::text
    FROM public.student_courses sc
   WHERE sc.course_id = NEW.course_id
     AND sc.student_id <> COALESCE(NEW.uploaded_by, '00000000-0000-0000-0000-000000000000'::uuid);
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_notify_new_course_image ON public.course_images;
CREATE TRIGGER trg_notify_new_course_image
AFTER INSERT ON public.course_images
FOR EACH ROW EXECUTE FUNCTION public.notify_new_course_image();

-- Notify all students when an admin publishes a new platform announcement
CREATE OR REPLACE FUNCTION public.notify_new_platform_announcement()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.is_published IS DISTINCT FROM true THEN RETURN NEW; END IF;

  INSERT INTO public.notifications (user_id, title, message, type, link)
  SELECT ur.user_id,
         NEW.title,
         LEFT(COALESCE(NEW.body, ''), 240),
         'info',
         COALESCE(NEW.link_url, '/announcements')
    FROM public.user_roles ur
   WHERE (NEW.audience = 'all'
       OR NEW.audience = 'students' AND ur.role = 'student'
       OR NEW.audience = 'tutors'   AND ur.role = 'tutor')
     AND ur.user_id <> COALESCE(NEW.created_by, '00000000-0000-0000-0000-000000000000'::uuid);
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_notify_new_platform_announcement ON public.platform_announcements;
CREATE TRIGGER trg_notify_new_platform_announcement
AFTER INSERT ON public.platform_announcements
FOR EACH ROW EXECUTE FUNCTION public.notify_new_platform_announcement();

-- Enable realtime delivery for notifications so the bell updates instantly
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
