# Responsive Navigation QA Checklist

Verifies that `DashboardBreadcrumb` and `DashboardNav` never overlap and remain readable on the smallest supported viewports (320px – 375px wide).

## Test viewports
- [ ] **320 × 568** (iPhone SE 1st gen / smallest supported)
- [ ] **360 × 640** (common Android baseline)
- [ ] **375 × 667** (iPhone SE 2/3)
- [ ] **375 × 812** (iPhone X/11/12 mini)

## Pages to test
For each viewport above, visit each page below while signed in as **student**, **tutor**, and **admin**:

- [ ] `/student/dashboard` (breadcrumb hidden — only DashboardNav visible)
- [ ] `/tutor/dashboard` (breadcrumb hidden)
- [ ] `/admin/dashboard` (breadcrumb hidden)
- [ ] `/study-hub` (fixed Navbar above — verify spacer)
- [ ] `/theory` (fixed Navbar above — verify spacer)
- [ ] `/tutors` (sticky header above)
- [ ] `/leaderboard` (sticky header above)
- [ ] `/study-hub/<courseId>` (deep route — 3+ crumbs)
- [ ] `/theory/<courseId>/<questionId>` (deep route — collapse to `…`)

## Visual checks (per page × viewport)
- [ ] DashboardNav row sits **fully below** the page header (no clipping behind fixed Navbar).
- [ ] DashboardNav links scroll horizontally without overlapping the breadcrumb row.
- [ ] Breadcrumb sits **below** DashboardNav with the top border separator visible.
- [ ] Breadcrumb wraps to a second/third row when content overflows (no horizontal scrollbar).
- [ ] Long labels truncate with ellipsis (`max-w-[55vw]` on the active crumb).
- [ ] When 4+ crumbs, middle segments collapse to a `…` icon.
- [ ] `Dashboard` home link + Home icon remain readable (text not clipped).
- [ ] Active DashboardNav pill (gold background + underline) is fully visible — not cut off at edges.
- [ ] Tap targets ≥ 32px tall on the breadcrumb, ≥ 36px on DashboardNav.
- [ ] No layout shift between breadcrumb appearing and main content rendering.

## Interaction checks
- [ ] Tapping the `Dashboard` crumb navigates to the role-correct dashboard home.
- [ ] Tapping any intermediate crumb navigates to the cumulative path.
- [ ] Active DashboardNav item updates immediately after navigation.
- [ ] Horizontal scroll on DashboardNav works with touch swipe; breadcrumb does **not** scroll horizontally.

## Regression: fixed Navbar pages
On `/study-hub` and `/theory`, scroll the page and confirm:
- [ ] The fixed top Navbar (h-16 mobile / h-18 desktop) never visually overlaps DashboardNav at rest (initial viewport).
- [ ] Spacer `pt-16 md:pt-[72px]` keeps the first DashboardNav pixel below the Navbar.

## Tools
- Chrome DevTools → Device Toolbar → custom 320×568, 360×640, 375×667.
- Or run in preview and use the responsive viewport toggle.
