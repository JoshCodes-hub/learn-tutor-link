## Goal
Phase-by-phase upgrade of the student dashboard, notifications hub, level-aware course access, and persistent profile identity, plus a tutor-side level picker for content creation.

---

## Phase 1 — Notifications Hub `/notifications`
**Files:** edit `src/pages/NotificationsPage.tsx`, edit `src/components/student/DashboardNotificationCard.tsx`

- Add filter chips: **All / Unread / Mentions / System** (client-side filter on `useNotifications` data).
- Add per-row "Mark read" button alongside existing "Mark all read".
- Smooth navigation: card "See more" already routes to `/notifications`; add `framer-motion` page transition + restore scroll position on back.
- Keep existing realtime subscription.

---

## Phase 2 — Unified "Updates" Tray (Announcements + Notifications together)
**Files:** new `src/components/student/UpdatesCenter.tsx`, edit `StudentDashboard.tsx` (replace separate `DashboardNotificationCard` + `PlatformAnnouncements` placement with a single tabbed card).

- Two tabs: **Notifications** (personal) and **Announcements** (platform).
- Unread badge sums both. Top-right action: "Open all" → `/notifications`.

---

## Phase 3 — Premium Quick Actions
**Files:** new `src/components/student/PremiumQuickActions.tsx`, mount above the existing tile grid in `StudentDashboard.tsx`.

Cards (with framer-motion `whileHover`/`whileTap`, gold-gradient icon chips):
- **Resume last quiz** → reads latest `quiz_attempts` where `completed_at IS NULL`, deep-links to `/quiz/:id`.
- **Start CBT simulation** → `/exams` (mock CBT).
- **Buy tutor quiz** → `/tutor-marketplace` (or storefront list).
- **Practice weak topic** → `/student/weak-area-drill`.

Each card shows a one-line dynamic subtitle (e.g. "Biology • 12 left") with skeleton while loading.

---

## Phase 4 — Exam Readiness Widget
**Files:** new `src/components/student/ExamReadinessWidget.tsx`, mount on dashboard.

- Reuse logic from `ReadinessRing` for the score.
- Add **Top 3 weak topics** as chips → each chip links to `/student/weak-area-drill?topic=...`.
- "Full breakdown" link → `/student/mastery-breakdown`.

---

## Phase 5 — Smarter Greeting + Persistent Avatar
**Files:** edit `src/components/student/MobileGreetingHeader.tsx`, edit `src/hooks/useAuth.tsx` (avatar cache only).

- Greeting already time-based; refine to also show day-name on first visit per session ("Happy Monday, Tunde").
- **Persistent avatar across sessions/logout:** cache `profile.avatar_url` in `localStorage` (`overra.avatar.<userId>`) on profile load, and hydrate `localAvatar` from cache before network fetch resolves so it appears instantly after re-login. Already saved server-side to `profiles.avatar_url` + `profile_image_url` so it survives logout — fix any case where one of the two is null by always writing both.
- Add a **logout button** in the header (small ghost icon with confirm) and merge the bell so the right-side cluster is `[Updates bell] [Logout]`. The bell already opens `/notifications`, which now contains both notifications + announcements (Phase 2 makes them one screen).

---

## Phase 6 — Student Level Switcher + Level-Gated Courses
**DB migration:** none needed — `profiles.academic_metadata.level` and `courses.level` already exist.

**Files:**
- new `src/components/student/LevelSwitcherDialog.tsx` (dialog with `100L … 500L` + "JAMB" + "Secondary").
- new `src/hooks/useStudentLevel.ts` (read/write `academic_metadata.level`, invalidate course queries).
- edit `src/pages/student/MyCourses.tsx`, course browse pages, and `FreshCourses` to filter `WHERE courses.level = currentLevel OR courses.level IS NULL` and show a soft empty state "No courses for 200L yet — switch level".
- Add a **Level pill** in `MobileGreetingHeader` next to the streak chip; tap opens `LevelSwitcherDialog`.
- Gate detail routes: if a student opens a course of a different level, show a "Switch to {level} to access" CTA instead of content.

---

## Phase 7 — Tutor Level Picker for Content
**Files:**
- edit `src/components/tutor/CreateCourseDialog.tsx`, `CreateQuizDialog.tsx`, `UnifiedQuizCreator.tsx`, `BulkQuizImport.tsx`: add a required **Level** select (100L–500L, JAMB, Secondary, "All levels") that writes to `courses.level` / quiz tags.
- edit `src/components/tutor/QuizManagement.tsx` to show a Level filter chip row.
- For resources/materials (`tutor_curricula`, `lecture_notes`): add same level field via small migration only if missing (verify, then add `level TEXT` column; otherwise reuse).

---

## Technical notes
- All new UI uses existing semantic tokens (gold/amber + white) and `framer-motion`. No new deps.
- Notifications data flows through existing `useNotifications` hook — no schema changes.
- Quick action "Resume last quiz" uses a single Supabase query bounded by `limit(1)` to keep dashboard fast.
- Level filtering is enforced **client-side first** (fast UX) and re-checked on detail-page mount; we intentionally don't change RLS so admins / cross-level browsing keeps working from other surfaces.
- Logout reuses `useAuth().signOut()`; no session changes.

---

## Out of scope
- Migrating roles or RLS.
- Backend cron / push notifications.
- Tutor payouts changes.
