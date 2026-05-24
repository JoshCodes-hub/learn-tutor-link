
# Phase 1 — Foundation Restructure (Dashboard + Navigation)

Scope is strictly the Student dashboard and the bottom navigation. No backend, auth, or unrelated page changes. No new features — only restructuring, hierarchy, and polish.

## 1. Bottom navigation — 5 tabs

Edit `src/components/app-shell/BottomTabBar.tsx`:

- Replace `STUDENT_TABS` with exactly 5 tabs, in order:
  1. **Home** → `/student/dashboard` (icon: `Home`)
  2. **Learn** → `/study-packs` (icon: `BookOpen`)
  3. **Practice** → `/student/readiness` (icon: `Target`)
  4. **Community** → `/community` (icon: `Users`)
  5. **Profile** → `/profile/edit` (icon: `User`)
- Keep the existing rounded amber pill + safe-area + active "pill" `layoutId` animation, but drop the elevated center "Upload" FAB tile — the new set is all equal-weight so the bar feels native Android / Material.
- Tone down icon weight (strokeWidth 2, active 2.2), tighter labels, and use the existing `font-semibold tracking-tight` style.
- `isStudentRoute` already forces student tabs on student routes — keep that.
- Hide `NewStudyPackFAB` on the dashboard (it duplicates the hero CTA). Done by adding `/student/dashboard` to its internal hidden-route list. The FAB stays on `/study-packs`, `/library`, etc.

No changes to school/teacher/parent/admin tab arrays.

## 2. Student dashboard — rebuild the page composition

Edit `src/pages/student/StudentDashboard.tsx`. Keep all existing data fetching, realtime, refresh, and dialogs (`BuyTokensDialog`, `PurchaseQuizDialog`, `OnboardingDialog`, `CommandPalette`, `PullToRefresh`). Only the **render tree** changes.

New top-to-bottom structure (single column, mobile-first, max width `max-w-3xl` on desktop so it stays calm):

```text
┌─────────────────────────────────────────┐
│  TopHeader                              │  greeting + university chip
│  • "Good morning, Joshua"               │  + streak pill + bell + avatar
│  • FUTA badge · Level · Dept            │
├─────────────────────────────────────────┤
│  StudyPackHeroCard  (single hero)       │  one card, 3 CTAs:
│  • Upload PDF                           │   Upload PDF / Continue / Generate
│  • Continue Studying                    │
│  • Generate Study Pack                  │
├─────────────────────────────────────────┤
│  Quick Actions (5 tiles, 2-col grid)    │  Flashcards, Practice Quiz,
│                                          │  Audio Reader, Ask AI, Saved
├─────────────────────────────────────────┤
│  Continue Learning                      │  recent courses + study packs
│  (horizontal snap-scroll on mobile)     │  + unfinished quizzes
├─────────────────────────────────────────┤
│  Opportunity Hub (preview)              │  4 simple cards:
│                                          │  Internships · Scholarships
│                                          │  Hackathons · Opportunities
├─────────────────────────────────────────┤
│  Student Spotlight                      │  3–5 top scholars row
└─────────────────────────────────────────┘
```

What gets removed from the current page (kept in code, just not rendered on the dashboard):

- Desktop gold welcome strip (`motion.section` lines ~842–893)
- `UpdatesCenter`, `PremiumQuickActions`, `ExamReadinessWidget`, `CampaignBanner`, `UploadCTABanner`, `FreshCourses`, `PremiumStatCard` trio, `AIQuizRecommendations`, `SubjectCombinationTracker`, `ReadinessRing`, `Achievements`, `ReferralCard`, `TeamCard`, `FavoriteTutors`, `BookmarkedQuestions`, `TeamChallenges`, `TeamChat`, `MyCommunities`, `RecentStudyPacksCard`, `MotivationalQuote`, the inline quiz catalog with search/filter/dropdowns, recent attempts list, purchase requests list.
- The whole `DashboardNav` horizontal pill bar (it duplicates the new bottom nav on mobile and adds clutter on desktop).
- `MobileGreetingHeader` + `SignatureHero` get replaced by the new `TopHeader` + reused `StudyPackHero`.

Imports cleaned up to match. Removed components are NOT deleted — they remain available for other routes (e.g. `/community`, `/leaderboard`) and future phases.

## 3. New / reused components

**New:**

- `src/components/student/dashboard/TopHeader.tsx`
  - Greeting (Good morning/afternoon/evening + first name)
  - University chip ("FUTA") + level/department subline
  - Streak pill (uses existing streak query already in `StudyStreak`; lift the small read into the header)
  - Bell → `/notifications`
  - Avatar → `/profile/edit`
- `src/components/student/dashboard/QuickActionsGrid.tsx`
  - 2-col grid on mobile, 5-col on `md+`
  - 5 fixed tiles with Lucide icons (`Layers`, `Target`, `Headphones`, `Sparkles`, `Bookmark`)
  - Rounded-2xl, soft border, no neon, single gold accent dot
  - Routes: `/flashcards`, `/student/readiness`, `/audio-learning`, `/ai-tutor`, `/library`
- `src/components/student/dashboard/OpportunityHubPreview.tsx`
  - 4 simple cards (Internships, Scholarships, Hackathons, Opportunities) — currently route to `/coming-soon` (placeholder); structure ready for university scoping later.
- `src/components/student/dashboard/StudentSpotlight.tsx`
  - Thin wrapper that re-uses existing `TopScholarsCard` data but with a compact horizontal row layout (3 avatars + name + badge).

**Reused unchanged:**

- `StudyPackHero` (hero card with the 3 CTAs already exists — just verify the three CTAs match: Upload / Continue / Generate; minor copy tweak if needed)
- `ContinueLearning` (already shows recent courses/packs)
- `PullToRefresh`, `CommandPalette`, dialogs

## 4. Design system polish

- Background: keep `bg-background` (white). Surfaces: `bg-card` + `border-amber-100/60`.
- Accent: existing soft-gold (`amber-500/600`). No neon, no heavy gradients on dashboard tiles — flat surfaces with a 2px gold top accent on the hero only.
- Spacing: section gap `mb-6` mobile / `mb-8` desktop. Card padding `p-5` mobile / `p-6` desktop. Min touch target 44px.
- Typography: keep existing `font-display` for headings, `font-sans` body. Reduce on-page heading count — only the hero and section labels.
- Icons: Lucide only (already the standard). Consistent size 20px in tiles, 22px in nav, 18px in inline chips.
- Motion: keep `framer-motion` fade/translate-in already used; remove decorative blob backgrounds on the dashboard.

## 5. University-first scaffolding (structure only, no filtering)

- Add a `university` field read from `profile?.university || "FUTA"` and surface it in `TopHeader` (chip) + pass as a prop to `OpportunityHubPreview` and `StudentSpotlight` so they're ready to scope later. No query changes.

## Files touched

- `src/components/app-shell/BottomTabBar.tsx` — 5-tab set, flatten center FAB.
- `src/components/student/NewStudyPackFAB.tsx` — hide on `/student/dashboard`.
- `src/pages/student/StudentDashboard.tsx` — new render tree, prune imports.
- `src/components/student/dashboard/TopHeader.tsx` — new.
- `src/components/student/dashboard/QuickActionsGrid.tsx` — new.
- `src/components/student/dashboard/OpportunityHubPreview.tsx` — new.
- `src/components/student/dashboard/StudentSpotlight.tsx` — new.

No DB, no edge function, no auth, no other pages changed.

## Out of scope (Phase 2+)

- Building real Opportunity Hub data
- University filtering / multi-uni switcher
- Learn / Practice / Community tab page redesigns
- Tutor or admin dashboards
