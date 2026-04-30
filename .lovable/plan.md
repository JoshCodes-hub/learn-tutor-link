
# Phase 1 — University Track: Polish, Not Rebuild

You're right — let's stop wasting tokens. This plan is **strictly white + gold** (no navy, no dark surfaces in default view), keeps every existing feature working, and ships in **sequenced milestones**. We finish each milestone before touching the next.

University-only for now. School Management is out of scope for Phase 1 (kept as-is, untouched).

---

## Design rules (locked for the entire phase)

- **Palette:** white background `#FFFFFF`, soft gold tint surfaces, gold primary `hsl(43 78% 52%)`, deep charcoal text `hsl(220 15% 12%)` for readability. **No navy surfaces.** Gold gradients for accents only.
- **Type:** Inter throughout (already loaded).
- **Logo:** remove the white background plate behind the logo on splash and across the app — render the PNG directly on the gold/white surface.
- **Feel:** generous whitespace, soft gold shadows, subtle motion. Award-winning = restraint + craft, not decoration.

---

## Milestone 1 — Splash + Landing (the first impression)

**1.1 Splash (`src/components/SplashScreen.tsx`)**
- Full-bleed gold gradient background (already there) — keep.
- **Remove the white rounded square behind the logo.** Render `logo.png` directly, larger, with a soft gold drop-shadow.
- Animated logo: gentle scale-in + a single shimmer sweep across it.
- Tagline **"Read with Ease."** slides down from above with a subtle fade — already wired, refine timing.
- Auto-advance to landing in ~2.5s.

**1.2 Landing page (`src/pages/Index.tsx` + `HeroSection.tsx`)**
- **Switch to white + gold theme.** Replace dark hero overlay with a clean white hero.
- **Hero visual:** "girl holding phone reading 📚 on the app." Generate a dedicated hero image (warm, editorial, gold-tinted) and place it on the right side of the hero on desktop, top on mobile.
- **Headline:** "Prepare Smarter. Perform Better." with gold gradient on the second line.
- **Two clear CTAs:**
  - Primary gold: **"Get Started as Student"** → `/auth?mode=signup&intent=student`
  - Secondary outlined gold: **"Apply as Tutor"** → `/auth?mode=signup&intent=tutor` (then routes to `/apply-tutor` after account creation)
  - Tertiary text link: **"Register Your School"** → `/auth?mode=signup&intent=school_owner`
- **Sections below hero (rewritten copy, white + gold cards):**
  1. **For University Students** — what you get on free vs. premium
  2. **For School Owners** — register your school, get admin approval, manage everything
  3. **How It Works** — 3 steps with gold numbered medallions
  4. **Featured Tutors** — keep existing, restyle to white cards with gold accents
  5. **Testimonials** — white cards, gold quote marks
  6. **FAQ** — clean accordion
  7. **Final CTA** — single big gold card

Existing sections (`TrustStrip`, `StatsSection`, `FeaturesSection`, `HowItWorksSection`, `FeaturedTutorsSection`, `TestimonialsSection`, `FAQSection`, `TutorSection`, `CTASection`) stay — we restyle in place, do not delete.

---

## Milestone 2 — Single Entry Auth + Intent-Based Registration

**2.1 One sign-in page for everyone (`src/pages/Auth.tsx`)**
Already exists. Keep it as the **single login** for students, tutors, school owners, admins. Polish the visual to white + gold (remove `bg-gradient-hero` dark background → use clean white with subtle gold mesh).

**2.2 Different registration flows based on `?intent=` param** (existing pattern, formalize it):

- `intent=student` → after account creation, route to **`/onboarding/student`** (new wizard, see Milestone 3)
- `intent=tutor` → after account creation, route to **`/apply-tutor`** (existing application form). On submit → "Pending admin approval" screen. On approval → `/tutor/dashboard`.
- `intent=school_owner` → after account creation, route to **`/school/register`** (existing). On submit → "Pending admin approval." On approval → `/school/dashboard`.

The Auth page already reads `intent` and routes correctly — we just need to (a) restyle white+gold and (b) confirm the post-signup destinations call out the approval states clearly.

---

## Milestone 3 — Student Registration Wizard (the new flow you asked for)

New file: **`src/pages/onboarding/StudentOnboarding.tsx`** — a 4-step wizard, replacing the current scattered onboarding for students who chose `intent=student`.

```text
Step 1: Pick your school          (search + select; defaults preloaded)
Step 2: Pick your level / year    (100L, 200L, … or year 1-5)
Step 3: Pick your department      (filtered by school)
Step 4: Pick at least 3 tutors    (filtered by school + level + department)
        - Strongly suggested but skippable (per earlier decision)
        - Shows tutor card with avatar, name, courses, rating
        - Adds them to `favorite_tutors` table on submit
```

After submit → `/student/dashboard` with a one-time **Welcome tour** highlighting: tutors, quizzes, leaderboard, tokens, upgrade.

**Level changes after onboarding:** add a "Change Level" control in Edit Profile. When level changes, the dashboard re-queries tutors filtered to the new level.

**New tutor notifications:** add a Postgres trigger on `profiles` (or on `tutor_applications` approval) that, when a new tutor is approved for a school, inserts a notification into `notifications` for every student in that school with `link=/tutor/{id}` and message *"New tutor available — follow to get their quizzes."*

---

## Milestone 4 — Free vs. Premium Plan Definition

You asked for suggestions. Proposing this split (we'll wire it into the dashboard upgrade card):

**Free tier (default for every new student)**
- Unlimited practice quizzes from your selected tutors
- Up to 5 tutors followed
- Basic AI explanations (10 / day)
- Daily streak + leaderboard
- 50 starter tokens (one-time)

**Premium packs (token-based, already wired via Paddle)**
- **Starter** $0.70 → 100 tokens
- **Plus** $1.50 → 250 tokens *(most popular)*
- **Pro** $2.00 → 400 tokens
- **Mega** $3.00 → 700 tokens

Premium unlocks: unlimited AI explanations, AI Tutor chat, theory-answer grading, weak-area drills, exam-readiness deep reports, offline CBT mode, unlimited tutor follows.

The token + Paddle pipeline already exists — we just present it cleanly in a redesigned "Upgrade" card on the student dashboard.

---

## Milestone 5 — Student Dashboard Polish (white + gold, premium feel)

`src/pages/student/StudentDashboard.tsx` already uses `DashboardHero` + `PremiumStatCard`. We:
- Restyle to white surfaces with gold accents (currently leans dark/navy in some spots).
- Reorganize into a clear grid:
  1. **Hero greeting card** (gold gradient, name, streak, today's goal)
  2. **My Tutors strip** (horizontal scroll, gold-bordered avatars, "+ Add tutor" button)
  3. **Quick Actions** (Practice, Theory, AI Tutor, Mastery)
  4. **Stats row** (4 PremiumStatCards: tokens, streak, quizzes done, accuracy)
  5. **Continue Learning** (last quiz resume)
  6. **Upgrade card** (gold, lists premium perks + CTA to BuyTokensDialog)
  7. **Leaderboard preview**
- All animations: subtle fade-up + soft gold hover lift.

---

## Milestone 6 — Admin Oversight (already exists, light polish)

Admin dashboard already covers: tutor application approval, school application approval, tutor management, withdrawal management, token purchase management, content moderation, audit logs, platform analytics. **No new build needed.** Just light visual restyle to match the new white+gold theme so it doesn't look out of place.

---

## Milestone 7 — Tutor Flow (already exists, light polish)

- Apply via landing CTA → `/auth?intent=tutor` → `/apply-tutor` (existing).
- After admin approves: `/tutor/dashboard` shows their students, quizzes, earnings, withdrawal — **all already built**. Just restyle to white+gold.

---

## Things you didn't mention but should add (small but high-impact)

1. **Email on key events** — already have Resend. Send: welcome email on signup, tutor-approved email, school-approved email, new-tutor-in-your-school email. (Edge functions exist; we just wire missing triggers.)
2. **Empty states** — when a student has 0 tutors / 0 quizzes, show a friendly white+gold empty state with one clear next action.
3. **Skeletons** — replace any spinner with shimmer skeletons on dashboard load (better perceived speed).
4. **Mobile bottom tab bar** — already exists (`BottomTabBar`), restyle to white+gold.
5. **First-login tour for students** — 4 quick tooltips on the dashboard the first time they land.
6. **"Change tutors" anytime** — add an Edit button on the My Tutors strip that opens the tutor picker again (reuses Milestone 3 step 4).

---

## Execution order (we ship one at a time, you confirm, we move on)

1. **Milestone 1** — Splash (remove logo bg) + Landing redesign white+gold + new hero image
2. **Milestone 2** — Auth page restyle + confirm intent routing
3. **Milestone 3** — Student onboarding wizard (school → level → dept → tutors)
4. **Milestone 5** — Student dashboard restyle (white + gold premium)
5. **Milestone 4** — Premium upgrade card wiring (Paddle already done)
6. **Milestone 6 + 7** — Admin + Tutor dashboards visual restyle pass
7. **Email triggers + empty states + tour** (polish pass)

School Management System stays untouched until Phase 2.

---

## Technical notes (for reference, ignore if not technical)

- Update `src/index.css` tokens: keep current white background but **remove the dark hero gradient** from `--gradient-hero` and replace with a soft white→cream gradient. Update sidebar tokens to white+gold variant.
- Restyle Tailwind utility usage in landing sections: replace `bg-gradient-hero`, `text-white`, dark overlays → white surfaces, charcoal text, gold accents.
- New file: `src/pages/onboarding/StudentOnboarding.tsx` + route `/onboarding/student` in `AnimatedRoutes.tsx`.
- New file: `src/components/onboarding/TutorPickerStep.tsx` — reusable for both onboarding and "change tutors later."
- New AI-generated hero image: `src/assets/hero-student-reading.jpg` (girl holding phone, gold-tinted editorial).
- Migration: trigger function `notify_students_of_new_tutor()` on tutor_applications status → 'approved'.
- No schema changes needed for tutor following — `favorite_tutors` table already exists.
- No new secrets needed.

---

**Confirm and I'll start Milestone 1 immediately. We finish that, you see it, then we move to Milestone 2. No jumping around. No rebuilds.**
