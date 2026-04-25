# 🧠 OverraPrep AI – Master System Grid Implementation

This is a **massive transformation** — moving from "FUTA-only university platform" to a **full Nigerian academic ecosystem** spanning Secondary School → JAMB → University. Doing it all in one shot would produce shallow, broken work. I'm proposing **5 sequential phases** that each ship a working slice.

---

## 📐 Architectural Foundation (cuts across all phases)

### New "academic_path" concept
Every user gets an `academic_path` profile field with three values:
- `secondary` (JSS1–SS3, WAEC/NECO)
- `jamb` (UTME candidate)
- `university` (existing FUTA-style flow)

This single field drives:
- Which dashboard layout renders
- Which courses/subjects appear
- AI prompt tone (simple / fast / deep)
- Which features unlock (e.g., JAMB Intelligence only for `jamb`)

### Database additions (Phase 1 migration)
- `profiles.academic_path` enum (`secondary` | `jamb` | `university`), nullable until onboarded
- `profiles.academic_metadata` jsonb (level, target_course, subjects, school, department)
- `subjects` table (name, category: secondary/jamb, level)
- `courses.path_type` (which academic_path the course belongs to)
- `questions.year` int + `questions.is_past_question` bool (for JAMB past Qs)
- `study_plans` table (user_id, generated roadmap from Strategy Engine)
- `user_performance_snapshots` table (for Intelligence Layer readiness scores)

### Routing changes
New onboarding gate: `/onboarding/path` → `/onboarding/refine` → role-correct dashboard. Existing users without `academic_path` get redirected here on next login.

---

## 🚀 Phase 1 — Smart Onboarding Gate + Academic Path Foundation
**Goal:** Every user picks a path; the platform remembers it and routes accordingly.

1. DB migration: add `academic_path`, `academic_metadata`, seed `subjects` table (WAEC subjects, JAMB combinations)
2. New pages:
   - `/onboarding/path` — 3 large cards (Secondary / JAMB / University)
   - `/onboarding/refine` — dynamic form per path (level + subjects, target course, school+dept+level)
3. Auth gate in `useAuth` / `AnimatedRoutes`: if logged in but `academic_path` is null → force redirect to `/onboarding/path`
4. Update `EditProfile` to allow changing path later
5. Update `DashboardNav` — link labels stay the same but visibility adapts (e.g., "Theory Prep" hidden for Secondary JSS levels, "JAMB Intelligence" only shown to JAMB users)
6. Seed default subjects + 1 sample course per path so onboarding leads to non-empty dashboards

**Deliverable:** A new student picks "JAMB", refines target course = Medicine + UTME combo, lands on a JAMB-flavored dashboard.

---

## 🟦 Phase 2 — Secondary School Track
1. Subject-based browse page (Math, English, Physics…) replacing course/department UX for `secondary` users
2. "Explain like I'm 12" toggle on the AI explanation panel — passes a `tone: simple` flag to `ai-explanation` edge function which adjusts the system prompt
3. Flashcards table + simple flip-card UI inside Study Hub
4. Audio learning: use browser `SpeechSynthesis` to read explanations aloud (no extra cost; later upgradeable to ElevenLabs)
5. Tutor application form gets a "specialization" field: secondary / JAMB / university

---

## 🟨 Phase 3 — JAMB Intelligence Engine (the killer feature)
1. Past-question importer for tutors: bulk upload tagged with `year` and `subject`
2. New `/jamb-intelligence` page:
   - "Repeated questions" view (questions appearing in 2+ years)
   - "High probability topics" — heatmap by topic frequency across years
   - Score predictor: based on user's recent attempt accuracy, project total UTME score (sum across 4 subjects)
   - "Can you reach your target?" — compare predicted vs target_course cutoff
3. Stricter CBT timer mode: locks navigation, mimics real JAMB UI (single question at a time, calculator off by default)
4. Subject-combination tracker on dashboard (4 subjects + readiness meter per subject)

---

## 🟥 Phase 4 — University Theory Dominance + AI Grading Upgrade
Most of this exists today; we deepen it for 300–500 level:
1. Course Survival Kits — bundles (notes + past-question summary + 50 likely Qs + model answers) tutors create as one purchasable product
2. Improve `evaluate-theory-answer` edge function: structured rubric output (Content / Structure / Examples / Conclusion) with per-criterion scores
3. "Improve my answer" button — sends student answer back through AI gateway with `mode: improve` to suggest specific edits
4. Deep notes editor for tutors (rich text + image embeds reusing the `question-images` bucket)

---

## 🧠 Phase 5 — Universal Layers (Intelligence + Strategy + Viral)
1. **Intelligence Layer** — nightly edge function computes per-user: weak topics, strength areas, time spent, readiness score (0–100); stored in `user_performance_snapshots`; dashboard shows readiness ring chart
2. **Exam Strategy Engine** — `/strategy` page that generates a personalized "What to read / what to skip / 7-day plan" using AI gateway, seeded by performance snapshot + academic_path
3. **AI Tutor chat** — new `/ai-tutor` chat page (streaming), system prompt selected by `academic_path` (simple / fast / deep tone)
4. **Viral modes** (each is a single page with a curated AI prompt):
   - `/exam-tomorrow` — "Cram mode" — top 20 likely Qs + 1-page cheat sheet
   - `/can-i-pass` — readiness predictor with shareable result card
   - `/two-hours-left` — bite-sized last-minute tips per subject
5. **Tutor specialization filters** on `/tutors` so students see tutors matching their academic_path
6. Update landing page hero copy to the new positioning ("Learn. Practice. Understand. Write. Strategize. Succeed — across all levels of education.")

---

## ⚠️ What I am NOT promising in this plan
- Native mobile app (still PWA)
- Real-time voice tutoring
- Manually authored content for every WAEC subject + every JAMB year — tutors must upload; we seed only sample data per path
- Payment changes — token economy stays in current "free access" mode per existing memory rule

---

## ✅ Suggested execution order
Phase 1 is **non-negotiable first** — every other phase depends on `academic_path` existing. After Phase 1 ships and you confirm onboarding works for all 3 paths, I'll proceed to Phase 2 (Secondary), then 3 (JAMB), then 4 (University depth), then 5 (Universal layers).

**Approve this plan and I'll start with Phase 1: Smart Onboarding Gate + Academic Path Foundation.** If you'd rather jump to a specific phase first (e.g., go straight to Phase 3 JAMB Intelligence), say so before approving.