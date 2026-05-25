# Phase 6 — Production Readiness

Scoped to high-impact, low-risk changes that reuse existing infrastructure (`analytics_events`, `client_errors`, `study_streaks`, `audit_logs`, `offlineSrsCache`, `offlineLibraryCache`, `notifications`, existing PWA manifest). No dashboard redesign, no new features.

## 1. Reliability fixes
- Fix `StudyHub.tsx` dynamic-import error surfacing in console (runtime error).
- Harden top-level `ErrorBoundary`: friendly empty state, **Retry** + **Reload** + "Report" (writes to `client_errors`), separate chunk-load error path that auto-soft-reloads once.
- Wrap every lazy route in a Suspense boundary with a skeleton fallback (already partial) — standardize on a `RouteFallback` component.

## 2. Performance pass
- Add `<link rel="preload" as="image">` only for splash logo and a `requestIdleCallback`-based prefetcher (`src/lib/routePrefetch.ts`) that warms the most likely next route after dashboard idle (e.g. `/courses`, `/library`, `/review`).
- Memoize heavy lists: `Leaderboard` rows, `ActivityFeed` groups, `CourseChat` reaction map (already memo'd).
- Convert `CourseChat` realtime subscription to single channel + cleanup audit (already cleans up — verify). Add `visibilitychange` pause for realtime channels in `useNotifications` and `useActivityFeed` to stop work while tab hidden.
- Add a tiny `useVirtualList` (windowing only when length > 50) — apply to `CourseChat` and `ActivityFeed` if length warrants. Skip if not needed; document threshold.

## 3. Mobile polish (no redesign)
- Audit tap targets in `TopHeader`, `QuickActionsGrid`, `NotificationCenter` filters → enforce `min-h-11 min-w-11` where needed via class additions only.
- Add `overscroll-behavior: contain` + `touch-action: manipulation` globally in `index.css` to remove double-tap zoom and rubber-band on chat/audio.

## 4. Analytics foundation
- Extend `src/lib/analytics.ts` (existing) with `track(event, props)` typed wrapper that inserts into `analytics_events` (best-effort, non-blocking, batched in a 2s window).
- Instrument: dashboard view, course open, quiz start/finish, AI generation success, flashcard review, opportunity click, tutor follow, audio play.
- Respect `privacy_settings.analytics_opt_out` if it exists; otherwise default-on for authenticated users only.

## 5. Admin insight dashboard
- New page `/admin/insights` (admin-only) showing:
  - DAU/WAU/MAU (computed via SQL RPC `get_admin_insights` on `analytics_events`)
  - Top 5 universities by active users
  - Top 5 courses by quiz attempts (last 30d)
  - AI usage trend (last 14 days) — simple inline sparkline (`recharts` already in app)
  - Tutor activity: top 5 by uploads + students impacted
  - Subscription growth: weekly counts from `token_purchases`
- One SECURITY DEFINER RPC, admin-only via `has_role(_user_id, 'admin')`.

## 6. Session security
- Add `session_devices` table: `(id, user_id, session_token, user_agent, last_seen_at, created_at)`. Token is a random `crypto.randomUUID()` minted at login and stored in `localStorage`.
- On every app mount, `useAuth` upserts the row and polls every 60s. A new device login bumps `session_token`; the previous device, on its next poll, detects the mismatch and gracefully signs out with a toast "Signed in on another device".
- Trigger inserts a `notifications` row "New sign-in detected" with the new device's UA.

## 7. Protected content + screenshot deterrence
- Migrate any remaining public premium URLs to **signed URLs** via a new edge function `signed-asset` that checks: enrollment, premium, or tutor ownership before issuing a 5-minute signed URL from the private bucket.
- Add `<ProtectedView>` wrapper that:
  - Adds `blur-md` class when `document.visibilityState === "hidden"`.
  - Sets `userSelect: none`, `-webkit-touch-callout: none`.
  - On Capacitor Android, calls `FLAG_SECURE` shim if `window.AndroidSecure?.enable()` exists (graceful no-op on web).
- Apply to `MaterialAIPanel` premium materials and PDF previews.

## 8. Offline improvements
- Extend `offlineLibraryCache.ts` to also cache: last-opened summary, last 3 generated audio MP3 blobs, last 50 SRS cards (already exists).
- Add `/offline` route showing what's available offline; reuse `OfflineDownloads.tsx`.
- Add `useOnlineStatus()` hook and a sticky top banner "You're offline — showing cached content" only when on a data-bound route.

## 9. Search
- Confirm `/search` route hits `semantic-search` edge function with debounced (300ms) input; add typed result groups: Courses, Tutors, Opportunities, Materials, Discussions. Already partly done — add tabs with counts and keyboard arrow nav.

## 10. Background task cleanup
- Audit `useEffect` cleanups in: `CourseChat`, `useNotifications`, `useActivityFeed`, `AudioPlayerCard`, AI generation flows. Add `AbortController` to all `fetch` calls in long-lived components.

## Files (estimated)
- 1 migration: `session_devices` + `get_admin_insights` RPC + RLS
- 1 edge function: `signed-asset`
- New hooks: `useOnlineStatus`, `useSingleSession`
- New components: `RouteFallback`, `ProtectedView`, `OfflineBanner`
- New page: `src/pages/admin/AdminInsights.tsx`
- Edits: `ErrorBoundary`, `analytics.ts`, `useAuth.tsx`, `AnimatedRoutes.tsx`, `index.css`, `NotificationCenter.tsx`, `useActivityFeed.ts`, `MaterialAIPanel.tsx`, `StudyHub.tsx` (fix import)

## Out of scope
- Dashboard redesign
- New end-user features
- Subscription/pricing changes
- Onboarding tweaks

## Order of execution
1. Reliability fixes + ErrorBoundary
2. Migration (session_devices + insights RPC)
3. Edge function (signed-asset)
4. Analytics wrapper + instrumentation
5. Admin insights page
6. Session security wiring
7. ProtectedView + screenshot deterrence
8. Offline banner + cache extensions
9. Performance + mobile polish + cleanup
