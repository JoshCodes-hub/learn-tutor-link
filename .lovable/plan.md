# Phase 5 — Community, Engagement & Student Ecosystem

Builds on existing infrastructure (course chat, tutor follows, tutor communities, notifications, profiles) rather than rebuilding it. Closes gaps to make the platform feel like a living academic ecosystem.

---

## 1. Course Discussion upgrades (no redesign)

Extend `course_chat_messages` (one migration):

- Add `parent_id uuid` (threaded replies, nullable, self-ref, indexed)
- Add `is_ai boolean default false` + `ai_status text` (`pending|ready|failed`) for @AI replies
- Reuse existing `course_chat_reactions` + `course_pinned_prompts` — no schema change

`CourseChat.tsx` gains:
- Inline "Reply" affordance under each message → small thread strip (depth = 1, Slack-style; no nesting beyond one level)
- Tutor badge (gold pill) shown when message author is a course tutor (resolved from existing `quizzes.tutor_id` lookup we already do)
- `@AI <prompt>` detection: when a message starts with or contains `@AI`, fire `course-ai-reply` edge function that inserts an AI message with `is_ai = true`, scoped to course context (course code + recent N messages)
- Markdown rendering for AI messages (react-markdown, already in deps), human messages stay plain text

New edge function `course-ai-reply` (Lovable AI Gateway, `google/gemini-2.5-flash`):
- Auth: validate JWT, confirm `is_course_participant`
- Input: `course_id`, `parent_id`, `prompt`, last 10 messages for context
- Inserts placeholder row (`ai_status='pending'`), streams completion, updates row with `ai_status='ready'`
- Charges existing AI quota via `increment_ai_usage('chat_ai_reply', 30)`

## 2. Tutor follow → live signals

`tutor_follows` already exists. Add:
- Trigger `notify_followers_on_tutor_upload`: when a row is inserted into `lecture_notes`, `quizzes` (status=approved), or `tutor_announcements`, insert one `notifications` row per follower with type `tutor_upload` / `tutor_announcement` / `tutor_quiz`
- Hook this into the existing realtime notification bell (already wired in Phase 4)

## 3. Opportunity Hub (real)

Replaces the `OpportunityHubPreview` placeholder.

Tables:
```sql
opportunities (
  id, title, organization, category (enum:
    internship|scholarship|hackathon|competition|tech_program|career),
  description, deadline date, apply_url, cover_image_url,
  university text null, posted_by uuid, status (draft|published|archived),
  created_at, updated_at
)
opportunity_bookmarks (id, opportunity_id, user_id, created_at, unique pair)
```

RLS: published rows readable by any authenticated user; admins can CRUD; bookmarks owned by user.

Pages:
- `/opportunities` — filterable list (category chips, deadline sort, university scope), card grid, save toggle
- `/opportunities/:id` — detail view with Apply CTA + share
- `/admin/opportunities` — admin CRUD (table + dialog)

Dashboard `OpportunityHubPreview` rewires to live data (top 4 by deadline). Removes the "Coming soon" badge.

## 4. Student Spotlight

Table `student_spotlights (id, user_id, category text [graduating|innovator|hackathon|scholarship|top_performer], title, summary, image_url, link_url, featured_until, created_by, created_at)`. Admin-curated.

- Public read for authenticated users; admin write
- New `/spotlight` page (gallery) + dashboard strip `StudentSpotlightFeatured` (top 3 active)
- Existing XP-based `StudentSpotlight` component keeps working alongside (renamed to `TopXPStrip`)

## 5. Leaderboard split

Refactor `/leaderboard` (`LeaderboardPage`) to a tabbed view:

- **Top Students** — weighted score (existing logic, expanded):
  - 40% quiz accuracy (last 30d)
  - 20% flashcards reviewed (SRS table)
  - 15% study streak
  - 15% AI study activity (`ai_generation_history` count last 30d)
  - 10% engagement (course_chat_messages + reactions)
- **Top Tutors** — `tutor_uploads_count`, `students_impacted` (distinct quiz_attempts on their quizzes), `avg_rating`, `tutor_follows_count`

Two RPCs `get_student_leaderboard(_limit int)` and `get_tutor_leaderboard(_limit int)` returning pre-aggregated rows. Cached 5 min via React Query.

## 6. Smart Activity Feed

New table `activity_events (id, actor_id, verb, object_type, object_id, course_id null, university null, visibility [public|followers|course], created_at)`.

Triggers populate it from existing events:
- tutor upload (lecture_notes / quizzes / tutor_announcements)
- new opportunity published
- spotlight featured
- new course discussion (course-level only)
- self-actions (flashcard milestone, leaderboard movement) — written client-side via tiny `logActivity()` helper

Page `/feed` (calm chronological list, max 50 items). Dashboard gets a compact `<RecentActivityStrip />` (top 5, no infinite scroll).

## 7. Profile system improvement

`/profile/:userId` (`PublicProfile.tsx`) — extend, do not redesign:

Student profile blocks: university / department / level (from `profiles`), current streak, achievements, followed tutors count, study stats (quizzes taken, avg score, flashcards reviewed).

Tutor profile blocks: expertise tags, courses uploaded (count + list), follower count, total students impacted, average rating.

All pulled with one batched query; cached.

## 8. Notification system polish

- New notification types: `tutor_upload`, `tutor_announcement`, `mention` (when `@username` appears in chat — basic parse), `opportunity_new`, `leaderboard_move` (weekly)
- `NotificationCenter` groups by type (icon + accent), instant badge already wired via realtime
- Add filter chips: All / Tutors / Mentions / Opportunities / System

## 9. UX guardrails

- Keep white + gold theme, Inter typography, generous spacing
- No infinite scroll; max-50 pages
- Reactions stay minimal (existing 6-emoji set)
- AI chat replies rendered with `prose-sm` markdown
- Protected premium materials remain gated by existing `usePremium` — discussion/share never exposes file URLs

## Out of scope

- Onboarding, dashboard layout, AI engine internals, subscriptions — untouched
- Direct messaging between students (already exists via Phase 8 inbox)
- LiveKit/live sessions

---

## Technical changes

### Migrations (one file)
- Extend `course_chat_messages` (+parent_id, +is_ai, +ai_status, index)
- Tables: `opportunities`, `opportunity_bookmarks`, `student_spotlights`, `activity_events`
- RLS + admin policies
- Triggers: `notify_followers_*`, `activity_event_*`
- RPCs: `get_student_leaderboard`, `get_tutor_leaderboard`, `list_followed_tutor_activity`
- Enable realtime on new tables that need it (`activity_events`, extended `course_chat_messages`)

### New files
- `supabase/migrations/<ts>_phase5_community.sql`
- `supabase/functions/course-ai-reply/index.ts`
- `src/pages/opportunities/Opportunities.tsx`
- `src/pages/opportunities/OpportunityDetail.tsx`
- `src/pages/admin/AdminOpportunities.tsx`
- `src/pages/student/Spotlight.tsx`
- `src/pages/admin/AdminSpotlights.tsx`
- `src/pages/student/Feed.tsx` (rename existing social Feed kept)
- `src/components/feed/RecentActivityStrip.tsx`
- `src/components/spotlight/SpotlightCard.tsx`
- `src/components/opportunities/OpportunityCard.tsx`
- `src/hooks/useOpportunities.ts`, `useSpotlights.ts`, `useActivityFeed.ts`, `useLeaderboards.ts`
- `src/lib/activityLog.ts`

### Edits
- `src/components/course/CourseChat.tsx` — replies, tutor badge, @AI hook, markdown
- `src/components/student/dashboard/OpportunityHubPreview.tsx` — live data
- `src/components/student/dashboard/StudentSpotlight.tsx` — featured spotlights row + keep XP strip
- `src/pages/LeaderboardPage.tsx` + `src/components/student/Leaderboard.tsx` — tabs (Students/Tutors)
- `src/pages/profile/PublicProfile.tsx` — extended blocks
- `src/components/notifications/NotificationCenter.tsx` — filter chips + new types
- `src/components/layout/AnimatedRoutes.tsx` — register new routes
- `src/components/app-shell/BottomTabBar.tsx` — optional Feed tab (only if it fits; otherwise keep in More)

---

## Expected outcome

A student can: ask a question in CSC201, tag `@AI explain polymorphism`, get a clean markdown reply inline, react/reply, follow Dr. Ade and get notified when she uploads, browse curated internships/scholarships in Opportunity Hub, see Student Spotlight winners, check split Top Students / Top Tutors leaderboards, and watch a calm Activity Feed of what's happening across their academic world — all on the existing white + gold layout, no clutter.
