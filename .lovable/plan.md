# Phase 7 — Academic Organization, Library, Course Hub, Audio Refinement

Scope is large but additive. No dashboard redesign, no onboarding/subscription rework. Reuse existing tables (`student_courses`, `recently_opened_courses`, `user_resources`, `lecture_notes`, `srs_cards`, `quiz_attempts`, `ai_generation_history`, `student_resource_bookmarks`, `student_download_history`, `community_announcements`, `course_messages`) and the existing `globalAudio` singleton + `MiniPlayerBar`.

## 1. Course-first experience

**New components**
- `src/components/courses/CourseCard.tsx` — premium card: code, title, tutor, unread count, readiness %, 6 quick-action chips (Open, Continue, Audio, Flashcards, Quiz, Resources).
- `src/components/courses/MyCoursesGrid.tsx` — grid wrapper used on `MyCourses` and dashboard preview slot.

**Hook**
- `src/hooks/useCourseSnapshots.ts` — single batched query that returns `{ course, tutor, unread_updates, readiness_pct, last_opened_at }` for the student's enrolled courses (joins `student_courses`, `courses`, `recently_opened_courses`, counts unread `community_announcements`/`course_messages`, pulls readiness from existing `exam_readiness` data).

**Edits**
- `src/pages/student/MyCourses.tsx` — replace flat list with `MyCoursesGrid`.
- `src/pages/courses/CourseHub.tsx` — add ordered tab strip: Materials · PDFs · Notes · Flashcards · Quizzes · Audio · Discussions · Announcements. Reuse existing panels; only reorder + add a unified `CourseHubHeader` showing tutor + readiness.

## 2. Library rebuild

**Refactor `src/pages/student/Library.tsx`**
- Sticky search + filter chip rail.
- Sidebar groups: `Courses`, `Recent`, `Saved`, `Audio`, `Flashcards`, `AI Generations`, `Personal`.
- Body switches to compact `ResourceListItem` cards.

**New components**
- `src/components/library/LibrarySidebar.tsx`
- `src/components/library/ResourceListItem.tsx`
- `src/components/library/LibrarySearchBar.tsx` — debounced, hits `useCourseSearch` + `user_resources` title ILIKE in parallel.

**Duplicate detection**
- `src/lib/userResources.ts` — add `sha256` of blob during `saveResource`; store in `meta.content_hash` and `meta.normalized_title`.
- New helper `findDuplicateResource(userId, hash, title)` → returns existing row; UI shows "This looks like a duplicate of X — Replace / Keep both / Cancel".
- Migration adds index on `((meta->>'content_hash'))`.

## 3. Continue learning

- `src/hooks/useContinueLearning.ts` — merges last `recently_opened_courses`, last `globalAudio` track (persisted to `localStorage`), unfinished `srs_cards`, in-progress `quiz_attempts`, latest `ai_generation_history` → one ranked list.
- `src/components/student/ContinueLearningStrip.tsx` — horizontal carousel; one-tap resume.
- Mount on `StudentDashboard` above existing study-pack hero (not redesigning hero, just adding strip above).

## 4. Modern audio learning

**Refactor `src/pages/student/AudioLearning.tsx`**
- New layout: large artwork, animated waveform bar (CSS-only bars driven by `requestAnimationFrame` reading `currentTime`), big play/skip controls, speed pill (0.75/1/1.25/1.5/2), queue drawer, "Continue listening" row.
- Background-play indicator + sleep-timer button.

**New**
- `src/components/audio/Waveform.tsx` — lightweight, no extra deps.
- `src/components/audio/QueueDrawer.tsx`
- `src/components/audio/SpeedPicker.tsx`
- `src/lib/audioQueue.ts` — persistent queue (`localStorage`) wired to `globalAudio`; next/prev across tracks.

**Ambient mode**
- `src/lib/ambientAudio.ts` already exists — add `rain`, `forest`, `lofi` presets (CDN-hosted Pixabay free loops; URLs constants). Mixer slider in player ducks ambience under narration.

**Optional AI narration enhancement**
- Existing `text-to-speech` edge function stays default. Add a toggle "Enhanced AI voice (beta)" that, when on, routes through existing `overra-tts` edge function (already wired). No new paid deps.

## 5. Smart search

- Promote `useCourseSearch` to power a global `⌘K`/search-icon palette: `src/components/search/GlobalSearchPalette.tsx`. Returns grouped hits (Courses, Topics, Tutors, Materials, My Library, AI Generations). Triggered from TopHeader search icon and `/library`.

## 6. Resource auto-organization

- `saveResource` already accepts `courseId`/`topicId`. Add a small `autoTagResource(userId, blob, title)` heuristic that, when no course is supplied, fuzzy-matches title against the student's enrolled course codes (`CSC201`, etc.) and proposes a course before save.

## Database (one migration)

```sql
-- Index for content-hash duplicate lookup
CREATE INDEX IF NOT EXISTS idx_user_resources_content_hash
  ON public.user_resources (((meta->>'content_hash')));

-- RPC: course snapshots in one round-trip
CREATE OR REPLACE FUNCTION public.get_course_snapshots(_user_id uuid)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT coalesce(jsonb_agg(row_to_json(t)), '[]'::jsonb) FROM (
    SELECT c.id, c.code, c.name, c.department, c.level,
      (SELECT count(*) FROM community_announcements ca
        WHERE ca.course_id = c.id
          AND ca.created_at > coalesce((SELECT opened_at FROM recently_opened_courses
            WHERE user_id=_user_id AND course_id=c.id), 'epoch')) AS unread_updates,
      (SELECT opened_at FROM recently_opened_courses
        WHERE user_id=_user_id AND course_id=c.id) AS last_opened_at
    FROM student_courses sc JOIN courses c ON c.id = sc.course_id
    WHERE sc.student_id = _user_id
    ORDER BY last_opened_at DESC NULLS LAST, c.code
  ) t;
$$;
```

## Out of scope
- Dashboard redesign, splash, onboarding, subscriptions/pricing, tutor curriculum builder, new social features, new admin tools.

## Files (new)
CourseCard, MyCoursesGrid, useCourseSnapshots, LibrarySidebar, ResourceListItem, LibrarySearchBar, useContinueLearning, ContinueLearningStrip, Waveform, QueueDrawer, SpeedPicker, audioQueue, GlobalSearchPalette, CourseHubHeader, migration.

## Files (edited)
MyCourses, CourseHub, Library, AudioLearning, userResources, ambientAudio, StudentDashboard (1 import + 1 element), TopHeader (search icon hook), App router (palette mount).
