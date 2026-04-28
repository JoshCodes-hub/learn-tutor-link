# Restructure: First-time visitor flow & role-aware onboarding

## The problem today

The current entry flow is muddled:

- `/` already renders `Welcome`, but `App.tsx` also fires a global `SplashScreen` overlay on top of it, gated by a 24h `localStorage` flag. Result: splash and welcome compete; first-time visitors don't get a clean "splash → welcome" sequence.
- `Welcome` shows three persona tiles (Student / Tutor / School) but they all dump the user into `/auth` (or `/school/register`) without remembering the choice. After signup, everyone lands on `/dashboard` regardless of intent.
- `Auth.tsx` ignores the `?intent=` query param entirely. A user who clicked "I'm a tutor" still creates a generic student account and has to discover the tutor application page later.
- School registration is a separate flow (`/school/register`) that bypasses `/auth` — confusing because a school owner still needs an account.
- The marketing landing (`/website`) is orphaned and `noindex`'d, so the only public-facing brand surface is essentially hidden.
- The app supports two very different products (University CBT prep + School Management System), but nothing on the entry screen explains the split or routes users to the right product.

## Target experience (standard mobile-app pattern)

```text
                  ┌──────────────────────┐
   Cold open ───▶│   1. Splash (1.2s)    │  logo + tagline, auto-advances
                  └──────────┬───────────┘
                             ▼
                  ┌──────────────────────┐
   First visit ─▶│  2. Welcome carousel  │  3 swipeable slides:
                  │   (skippable)         │   • "Ace your exams with AI"
                  └──────────┬───────────┘   • "Run your school in one app"
                             ▼                • "Join 1000s of FUTA students"
                  ┌──────────────────────┐
                  │  3. Choose your path  │  Two big cards:
                  │                       │   A) University / Student prep
                  └────┬─────────────┬───┘   B) School Management
                       ▼             ▼
              ┌─────────────┐ ┌──────────────┐
              │ 4a. Persona │ │ 4b. School   │
              │   picker    │ │   intro      │
              │ Student /   │ │ "Register    │
              │  Tutor /    │ │  your school"│
              │  Parent     │ │              │
              └──────┬──────┘ └──────┬───────┘
                     ▼               ▼
              ┌─────────────┐ ┌──────────────┐
              │ 5a. Auth    │ │ 5b. Auth     │
              │ (signup/    │ │  + School    │
              │  signin)    │ │  registration│
              └──────┬──────┘ └──────┬───────┘
                     ▼               ▼
              Role-correct     /school/pending
              dashboard        → /school/dashboard
```

Returning users (have a session) skip steps 2–4 entirely and go straight to their role dashboard. Returning-but-signed-out users skip the welcome carousel (seen-it flag) and land on step 3.

## Plan

### 1. Fix the splash/welcome conflict
- Remove the global `SplashScreen` overlay from `App.tsx`.
- Make the splash a route-level concern: `Welcome` shows the splash inline on first paint, then fades into the welcome content. One screen, one transition.
- Keep the `lastSplashShown` 24h throttle so returning users don't re-see it.

### 2. Build a 3-slide welcome carousel
- New component `src/components/onboarding/WelcomeCarousel.tsx` with swipeable slides (framer-motion + dots indicator + Skip button).
- Slides:
  1. "Ace your CBT exams" (University track)
  2. "Run your school, end-to-end" (School track)
  3. "Free to start. Built in Nigeria."
- "Skip" and finishing the last slide both advance to the path picker.
- Persist `welcomeSeen` in localStorage so it only appears once.

### 3. New "Choose your path" screen
- New route `/start` rendering `src/pages/onboarding/ChooseProduct.tsx`.
- Two large cards:
  - **University & Exam Prep** → `/start/persona`
  - **School Management** → `/school/intro`
- Includes a small "I already have an account" link that goes to `/auth`.

### 4. Persona picker (University track)
- New route `/start/persona` rendering `ChoosePersona.tsx`.
- Tiles: Student, Tutor, Parent.
- Choosing a persona stores `signupIntent` in localStorage and navigates to `/auth?mode=signup&intent=<persona>`.

### 5. School intro + registration entry
- New route `/school/intro` with a short value-prop screen and a single CTA "Register my school".
- CTA goes to `/auth?mode=signup&intent=school_owner&redirect=/school/register`.
- After auth completes, `Auth.tsx` honours the `redirect` param and pushes school owners straight into the existing `/school/register` flow → `/school/pending` → `/school/dashboard`.

### 6. Make `Auth.tsx` intent-aware
- Read `intent` and `redirect` query params.
- When `intent=tutor`, after a successful signup auto-navigate to `/apply-tutor` instead of `/dashboard`.
- When `intent=school_owner`, auto-navigate to `/school/register`.
- When `intent=parent`, navigate to `/parent/dashboard`.
- Default (`student` or none) keeps current behaviour: role-correct dashboard via the existing redirect logic in `Welcome` / `Dashboard`.
- Show the chosen intent as a small badge above the form ("Signing up as a Tutor — change") so users can back out.

### 7. Rewire `/` and routing
- `/` becomes a thin controller that decides what to render based on auth + flags:
  - signed in → redirect to role dashboard (already implemented in `Welcome.tsx`, keep it)
  - signed out + `welcomeSeen` not set → splash → welcome carousel → `/start`
  - signed out + `welcomeSeen` set → straight to `/start`
- Keep `/website` for the public marketing page (and remove `noindex` if you want SEO; flag this as optional).
- Add the new routes (`/start`, `/start/persona`, `/school/intro`) into `AnimatedRoutes.tsx`.

### 8. Bottom tab bar polish (small)
- `BottomTabBar` currently shows on every page including the welcome funnel. Hide it on `/`, `/start*`, `/school/intro`, `/auth`, `/forgot-password`, `/reset-password`, and the splash so the onboarding feels like a real app and not a half-finished screen.

## Technical details

**Files to create**
- `src/components/onboarding/WelcomeCarousel.tsx`
- `src/pages/onboarding/ChooseProduct.tsx` (route `/start`)
- `src/pages/onboarding/ChoosePersona.tsx` (route `/start/persona`)
- `src/pages/school/Intro.tsx` (route `/school/intro`)

**Files to modify**
- `src/App.tsx` — remove global SplashScreen; let `Welcome` own it.
- `src/pages/app/Welcome.tsx` — inline splash → carousel-or-redirect logic; persona tiles route to `/start/persona`, school tile routes to `/school/intro`.
- `src/pages/Auth.tsx` — read `intent` + `redirect`; route post-signup accordingly; show intent badge.
- `src/components/layout/AnimatedRoutes.tsx` — register `/start`, `/start/persona`, `/school/intro`.
- `src/components/app-shell/BottomTabBar.tsx` — hide on onboarding/auth routes via `useLocation`.

**State / storage**
- `localStorage.welcomeSeen` — boolean, set after carousel finish/skip.
- `localStorage.lastSplashShown` — keep existing 24h throttle.
- `localStorage.signupIntent` — last chosen persona (used as fallback if URL param is lost on OAuth round-trip later).

**No DB or RLS changes required.** All work is client-side routing and UI; existing roles, profiles, and school-registration tables are untouched.

## Out of scope (call out, don't do)
- Restructuring `/dashboard` itself.
- Changing the marketing landing (`/website`) content.
- Adding Google OAuth (worth doing later — flag separately).
- Renaming any existing routes (avoids breaking shared links and PWA caches).
