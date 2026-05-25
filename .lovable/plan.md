# Redesign: My Courses, Library, Audio Learning, Course Hub
## + Level-Based Content Visibility

Locked taste: **white + gold + Inter** (per project memory). No navy, no new color tokens. All four pages will share one visual language so the ecosystem feels like one product, not four pages.

---

## 1. Level-based content filtering (data layer first)

Students only see what matches their `profiles.level` (and `department` where relevant).

- Add a `useStudentScope()` hook → returns `{ level, department }` from `profiles`.
- Filter queries in:
  - `MyCourses` enrolled list and "Discover" suggestions → `courses.level = student.level` (and same department when present).
  - `Library` → tutor materials only from courses matching the student's level.
  - `AudioLearning` → suggested course material list scoped to level.
  - `CourseHub` → block access (friendly "this course is for {level}" empty state) if the course's level doesn't match and the student isn't already enrolled.
- DB migration: add an RLS-safe SQL function `student_can_access_course(_course_id)` used by the new RPCs; tighten the `get_course_snapshots` query to filter by level. No destructive policy rewrites — additive only.

---

## 2. Shared design pattern (used across all four pages)

A single header + content frame so all four pages feel related:

```text
┌──────────────────────────────────────────┐
│  PageHeader                              │
│  ── eyebrow (level chip)                 │
│  ── H1 + 1-line subtitle                 │
│  ── action row (search / filter / CTA)   │
├──────────────────────────────────────────┤
│  Sticky FilterRail (chips + sort)        │
├──────────────────────────────────────────┤
│  Section blocks (titled, spaced)         │
│  · empty states with illustration        │
│  · skeletons that match final layout     │
└──────────────────────────────────────────┘
```

New shared primitives in `src/components/shell/`:
- `PageHeader.tsx` — eyebrow, H1, subtitle, right-aligned actions.
- `FilterRail.tsx` — sticky chip row + sort dropdown.
- `SectionBlock.tsx` — titled section with optional "see all".
- `EmptyState.tsx` — icon + headline + helper text + CTA.

All use existing semantic tokens (`bg-background`, `text-foreground`, `border-border`, gold accent via `bg-primary text-primary-foreground`). Mobile-first; 1-col → 2-col at `md`.

---

## 3. /my-courses redesign

- Header: "My Courses" + level chip ("300L · Computer Science") + search.
- Sections:
  1. **Continue learning** — horizontal scroller of last-opened courses with progress bar.
  2. **Enrolled** — `CourseCard` grid (already exists; reused).
  3. **Recommended for {level}** — courses matching student level the user has not yet joined, with one-tap Enroll.
- Empty enrolled state: friendly card with "Browse {level} courses" CTA.

## 4. /library redesign

- Header + sticky filter rail with chips: All · Notes · PDFs · Audio · Flashcards · AI Generations · Personal.
- Left rail collapses to a bottom-sheet on mobile.
- Resource list uses compact `ResourceListItem` (icon, title, course chip, date, duplicate badge).
- Two grouping modes: by Course (default) / by Type — toggle in the rail.
- Empty state per filter ("No audio yet — generate one from any PDF").

## 5. /audio-learning redesign

- New layout:
  - **Now Playing card**: large gold-tinted artwork, title, course chip, animated waveform, speed pill, queue button.
  - **Section list**: chapters/sections with per-section progress.
  - **Voice picker** moves into a sheet (no longer crowds the main view).
  - **Ambient mixer** as a single pill button → opens sheet with rain/forest/lofi sliders.
  - **Continue listening** strip above the player.
- Keep all existing TTS / Noiz / queue logic — pure presentation refactor.

## 6. /courses/:id (Course Hub) redesign

- New `CourseHubHeader`: course code badge, title, tutor avatar+name, level chip, enroll/leave button.
- Sticky tab bar (horizontally scrollable on mobile): **Overview · Materials · Audio · Flashcards · Quizzes · Discussions · Announcements**.
- Overview tab: tutor intro card, readiness ring, "what's new" feed (last 5 updates).
- Locked tabs show a soft lock icon when not enrolled, with one inline CTA.

---

## Technical section

**Files created**
- `src/components/shell/PageHeader.tsx`
- `src/components/shell/FilterRail.tsx`
- `src/components/shell/SectionBlock.tsx`
- `src/components/shell/EmptyState.tsx`
- `src/components/library/ResourceListItem.tsx`
- `src/components/courses/CourseHubHeader.tsx`
- `src/components/courses/ContinueLearningStrip.tsx`
- `src/components/audio/NowPlayingCard.tsx`
- `src/hooks/useStudentScope.ts`
- `src/hooks/useRecommendedCourses.ts`
- 1 supabase migration: `student_can_access_course` SQL function + level-filtering tweak to `get_course_snapshots`.

**Files edited (presentation only, business logic preserved)**
- `src/pages/student/MyCourses.tsx`
- `src/pages/student/Library.tsx`
- `src/pages/student/AudioLearning.tsx`
- `src/pages/courses/CourseHub.tsx`

**Not touched**
- Dashboard, splash, onboarding, subscriptions, tutor pages, auth, payments, edge functions, splash 3D scene, existing TTS/queue logic.

**Migration scope**
Additive only — one SQL function + one function update. No destructive policy changes. Existing RLS continues to apply.

---

## Confirmation

This is a large change (4 pages + shared primitives + level filtering). Reply **"go"** to proceed and I'll ship it end-to-end without further pauses. Reply with edits if you want to trim or reorder.
