
# Phase 2 — University-First Learning System

Scope: onboarding, schema scoping, Learn tab, course detail experience, tutor course-management. No dashboard redesign, no unrelated pages touched.

## 1. Database (single migration)

Add institution scoping + topics + course-scoped content. Backfill existing rows to FUTA.

- `profiles`: add `university text` (enum-like check: 'FUTA' | 'OAU'), `faculty text`. Backfill `'FUTA'` for existing students.
- `courses`: add `university text not null default 'FUTA'`, `faculty text`, index `(university, department, level)`.
- `lecture_notes`, `flashcards`, `quizzes`, `course_images`, `discussions`: already FK to `courses`, so university is inherited — no column needed, but add helper view / RLS check.
- New table `course_topics` (id, course_id FK, title, position, created_by). Topics get their own `topic_id` nullable FK added to `lecture_notes`, `flashcards`, `quizzes` for organization (nullable so legacy rows still work).
- New table `recently_opened_courses` (user_id, course_id, opened_at) for Recently Opened section. Unique (user_id, course_id), upsert on open.
- RLS additions:
  - `courses` SELECT: `university = (select university from profiles where id = auth.uid())` OR admin/tutor-owner.
  - Same scoping wrapper for `lecture_notes`, `flashcards`, `quizzes`, `course_images`, `discussions` via existing course FK (using a `course_in_my_university(course_id)` SECURITY DEFINER helper to avoid recursion).
  - `course_topics`: SELECT scoped via helper; INSERT/UPDATE/DELETE limited to course owner or admin.
  - `recently_opened_courses`: owner-only.

## 2. Onboarding flow (students only)

Insert a new step ahead of the existing path/refine flow. Tutors/admins unaffected.

New pages under `src/pages/onboarding/`:
1. `ChooseUniversity.tsx` — FUTA / OAU cards. Saves to `profiles.university`. Route `/onboarding/university`.
2. `ChooseFaculty.tsx` — faculty list scoped to selected university (static config first). Route `/onboarding/faculty`.
3. `ChooseDepartment.tsx` — departments under faculty. Writes `profiles.department`. Route `/onboarding/department`.
4. `ChooseLevel.tsx` — 100–500. Writes `profiles.level`. Route `/onboarding/level`.
5. Reuse existing `TutorMatching.tsx` as final step (preferred tutors to follow) — already exists.

Update `AcademicPathGate.tsx` so logged-in students missing `university | faculty | department | level` are redirected through the new sequence before `path` step. `ChoosePath`/`RefinePath` remain for academic-path selection (kept inside University track).

Static config file `src/config/universities.ts` exporting `{ FUTA: { faculties: { ... : [departments] } }, OAU: { ... } }`. Easy to add more universities later.

## 3. Learn tab restructure

Rename bottom nav "Learn" target from `/study-packs` → `/learn`. Create new `src/pages/learn/Learn.tsx` (mobile-first, single column, soft gold accents). Sections in order:

1. **Current Semester Courses** — `student_courses` joined with `courses`, filtered by `university`.
2. **Continue Learning** — last 3 `recently_opened_courses` rows with progress chip.
3. **Recommended Courses** — courses matching student `university + department + level` not in `student_courses`.
4. **Recently Opened Courses** — full list, horizontal scroll.
5. **Tutor Updates** — latest `lecture_notes` from `tutor_follows` for courses in this university.

Plus a single search input at top: searches course code/title, topic title, material title, tutor name — all scoped to the student's university.

`/study-packs` route remains as a deep link from Course Hub AI tab; no redesign.

## 4. Course detail experience (`CourseHub.tsx` upgrade in place)

Rework existing `/courses/:courseId` tabs to the spec, mobile-first. New tab set:

1. **Materials** (existing documents tab; keep Offline Ready badge via `CourseOfflineButton`)
2. **Flashcards** (existing; add tutor vs AI source chip)
3. **Quizzes** (existing; group: Practice / CBT / History)
4. **Study Packs** (existing AI tab; deep-link to Library with course pre-selected)
5. **Audio Lessons** (new tab — placeholder list; structure only, no external download)
6. **Discussions** (new tab — wires existing `discussions` table scoped to this course)

Add a **Topics** sidebar/strip above tabs: lists `course_topics` for the course; selecting a topic filters Materials/Flashcards/Quizzes by `topic_id`. "All topics" is default.

On open, upsert a row into `recently_opened_courses`.

## 5. Tutor course management

Reuse existing `TutorCourses.tsx` / `TutorCourseEditor.tsx`. Changes:

- New course form auto-stamps `university` from tutor's profile (tutors also get `university` on profile via onboarding; for existing tutors, default `'FUTA'`).
- Add **Topics manager** inside `TutorCourseEditor`: CRUD on `course_topics` with drag-reorder (simple `position` int).
- Material / Quiz / Flashcard upload forms gain a `Topic` select (optional).
- Remove any "create global content" shortcuts — every upload form requires a `course_id` (most already do; audit and gate the rest).

## 6. Search

Single hook `useCourseSearch(query)` in `src/hooks/useCourseSearch.ts`. One Supabase RPC `search_courses_scoped(_q text)` (security definer, scoped by caller's university) returning unified results (course / topic / material / tutor). Powers the Learn search bar.

## 7. Files

**New**
- `supabase/migrations/<ts>_phase2_university_scoping.sql`
- `src/config/universities.ts`
- `src/pages/onboarding/ChooseUniversity.tsx`
- `src/pages/onboarding/ChooseFaculty.tsx`
- `src/pages/onboarding/ChooseDepartment.tsx`
- `src/pages/onboarding/ChooseLevel.tsx`
- `src/pages/learn/Learn.tsx`
- `src/components/learn/CurrentSemesterCourses.tsx`
- `src/components/learn/ContinueLearning.tsx`
- `src/components/learn/RecommendedCourses.tsx`
- `src/components/learn/RecentlyOpenedCourses.tsx`
- `src/components/learn/TutorUpdates.tsx`
- `src/components/learn/LearnSearchBar.tsx`
- `src/components/course/CourseTopicsStrip.tsx`
- `src/components/course/CourseAudioLessonsTab.tsx`
- `src/components/course/CourseDiscussionsTab.tsx`
- `src/components/tutor/TopicsManager.tsx`
- `src/hooks/useUniversityScope.ts`
- `src/hooks/useCourseSearch.ts`
- `src/hooks/useRecentlyOpenedCourses.ts`

**Edited**
- `src/components/auth/AcademicPathGate.tsx` (gate on university/faculty/dept/level)
- `src/components/app-shell/BottomTabBar.tsx` (Learn → `/learn`)
- `src/App.tsx` (new routes)
- `src/pages/courses/CourseHub.tsx` (new tabs + topics strip + recent-opened upsert)
- `src/pages/tutor/TutorCourseEditor.tsx` (topics manager, topic select on uploads)
- `src/components/tutor/CreateCourseDialog.tsx` (auto-stamp university)
- `src/components/student/dashboard/TopHeader.tsx` (read real `profile.university` instead of fallback)

## 8. Out of scope (explicit)

- Dashboard layout changes
- Audio generation pipeline (only the empty tab + DB readiness)
- Quiz engine internals
- Admin moderation UI
- Tutor payout/storefront/community features
- Any visual redesign outside Learn + CourseHub + onboarding screens

## 9. Verification

- Run build.
- Manually walk: new user → onboarding (university → faculty → dept → level → match) → Learn → open course → see topics + 6 tabs → tutor adds a topic and uploads a material under it → student sees it filtered.
- Confirm an OAU-scoped seed course is invisible to a FUTA profile (SQL spot-check via `read_query`).

