# Plan: Native App Shell + School Management Module

This plan has three parts: (1) hide the marketing website, (2) restructure the experience as a true native-feeling app centered on University (JAMB paused), (3) add a School Management System (SMS) module where school owners can register, apply, and manage their secondary school.

---

## Part 1 — Hide the website (marketing) and boot straight into the app

The current `/` loads the marketing landing page (Hero, Stats, Features, Testimonials, etc.). We will replace that with a native-style app entry.

- New route `/` becomes an **App Shell**:
  - If not signed in → show a compact **Welcome screen** (logo, 1 line tagline, `Continue` + `Sign in` buttons) — no marketing sections, no navbar, no footer.
  - If signed in → redirect by role (student → `/student/dashboard`, tutor → `/tutor/dashboard`, admin → `/admin/dashboard`, school_owner → `/school/dashboard`).
- Move old landing to `/website` (kept but unlinked) so we don't lose it, and add `noindex` so it is effectively hidden.
- Remove `Navbar` + `Footer` from all in-app pages; they already use `DashboardNav`. The marketing `Navbar` stays only inside `/website`.
- Update `robots.txt` to disallow `/website` and `/jamb-*` paths.

## Part 2 — Pause JAMB, focus on University, native-app flow

### Pause JAMB
- Hide JAMB entries from `DashboardNav` (remove `JAMB Intel` link, already path-gated).
- In `ChoosePath` onboarding, disable the **JAMB** card with a "Coming soon" badge — only **University** and **Secondary (School)** selectable.
- Hide `/jamb-intelligence` route behind a feature flag (`FEATURES.jamb = false`) that renders a "Coming soon" screen instead of the page.

### Native-app flow (University-first)
Define the canonical flow:

```text
Splash → Welcome → Auth → Onboarding (path=university)
  → University onboarding (department, level, courses)
  → Home (Student Dashboard, mobile-native layout)
     ├─ Today (readiness ring, next action, streak)
     ├─ Courses (Theory Prep, Study Hub, Survival Kits)
     ├─ AI Tutor
     ├─ Tutors
     └─ Profile
```

- Replace top horizontal `DashboardNav` on mobile with a **bottom tab bar** (5 tabs: Home, Courses, AI, Tutors, Profile) — the current nav stays for desktop/tablet.
- Each page becomes a full-height app screen: sticky header with back button, safe-area padding (`env(safe-area-inset-top/bottom)`), swipe-in page transitions (already via `framer-motion`), pull-to-refresh on list screens.
- Remove generic card/website styling from in-app pages. New shared primitives:
  - `<AppScreen>` — handles header, back button, safe areas, scroll.
  - `<AppSection>` — consistent vertical rhythm.
  - `<AppListItem>` — iOS/Android-style row with leading icon, title, subtitle, chevron.
- Typography: keep `Playfair Display` headings, but in-app screens use tighter 20/24/28 sizes (not marketing 48/64). Body `Inter` 15px base.
- Standardize spacing scale (`4/8/12/16/24`) and corner radius (`xl` for cards, `full` for chips).

## Part 3 — School Management System (SMS) for Nigerian Secondary Schools

A new top-level module where a **school owner** registers their school, gets approved by admin, and then manages the full school from inside the app.

### Roles (extend `app_role` enum)
- `school_owner` — registers a school, owns it, manages everything.
- `school_admin` — delegated admin the owner invites.
- `teacher` — upload results, mark attendance, send announcements.
- `parent` — view their child's results, attendance, fees, announcements.
- Existing `student` reused — linked to a school via `school_students` when the school invites them.

### Core features (MVP that a Nigerian secondary school actually needs)
1. **School registration & approval** — owner submits school details (name, state, LGA, address, logo, owner phone/WhatsApp, NERDC/ME approval number optional); admin reviews in `/admin/schools`.
2. **Classes & arms** — JSS1–SS3 with arms (A, B, C…), class teachers assigned.
3. **Students roster** — bulk CSV import, assign to class, auto-generate student ID. Parent linkage (phone/email).
4. **Teachers roster** — invite by email, assign subjects + classes.
5. **Attendance** — daily mark per class (teacher), parent gets WhatsApp/email when child is absent (via Resend + optional future SMS).
6. **Results & report cards** — per-term CA (CA1, CA2, Exam = 40/40/100 or school-configurable), auto-compute position, grade, remark. Generate **branded PDF report card** (jsPDF, school logo, principal signature image).
7. **Fees & invoices** — define fee structure per class per term, track paid/unpaid, receipt PDF. (Payment collection deferred — record-only for now to match Free Access policy.)
8. **Announcements / Circulars** — school → parents + students (in-app notification + email via existing Resend edge fn).
9. **Timetable** — per class, per day, per period grid. Teachers see "my classes today".
10. **Exam & lesson notes hub** — teachers upload lesson notes / scheme of work (reuse `study-materials` bucket, scoped by school).
11. **CBT module integration** — teachers can reuse the existing quiz engine to give CBT tests to their class (scoped: quiz.school_id + quiz.class_id), results feed into the term's CA automatically.
12. **School dashboard analytics** — enrolment count, attendance rate this week, fee collection %, top-performing class, average score.

### Database (new tables)
```text
schools(id, owner_id, name, state, lga, address, logo_url, phone, email,
        approval_number, status[pending|approved|rejected], created_at)
school_members(id, school_id, user_id, role[owner|admin|teacher|parent])
school_classes(id, school_id, level[JSS1..SS3], arm, class_teacher_id)
school_students(id, school_id, class_id, user_id, student_code, parent_user_id, admission_date)
school_subjects(id, school_id, name, code)
class_subjects(id, class_id, subject_id, teacher_id)
school_terms(id, school_id, session[e.g. 2025/2026], term[1|2|3], starts_on, ends_on, is_current)
attendance(id, class_id, student_id, date, status[present|absent|late], marked_by)
results(id, term_id, student_id, subject_id, ca1, ca2, exam, total, grade, position, remark)
fees(id, school_id, class_id, term_id, title, amount)
fee_payments(id, fee_id, student_id, amount_paid, paid_on, receipt_no, recorded_by)
school_announcements(id, school_id, audience[all|class|parents], class_id, title, body, created_by)
timetable(id, class_id, day_of_week, period_no, subject_id, teacher_id, start_time, end_time)
```
RLS: every table scoped via `school_members` membership + role check. Owners/admins full CRUD inside their school, teachers write scoped to their classes/subjects, parents read-only scoped to their children, students read-only scoped to their own rows.

### New routes
```text
/school/register        → public form for school owners (creates school status=pending)
/school/pending         → "waiting for approval" screen
/school/dashboard       → owner/admin home (analytics, shortcuts)
/school/classes         → classes & arms manager
/school/students        → roster + bulk import
/school/teachers        → teachers manager
/school/attendance      → today's attendance (teacher view)
/school/results         → enter scores, generate report cards (PDF)
/school/fees            → fee structure + payments ledger
/school/timetable       → timetable builder
/school/announcements   → circulars
/admin/schools          → admin review of school applications
/parent/dashboard       → parent sees child(ren)
```

### Navigation
- After login, if `primaryRole === "school_owner"` → land on `/school/dashboard`; bottom tabs become: Overview, Classes, Attendance, Results, More.
- Teacher role → tabs: Today, Attendance, Results, Notes, Profile.
- Parent role → tabs: Child, Results, Attendance, Fees, Messages.

### Edge functions
- `school-report-card` — generate branded PDF report card for a student.
- Reuse `send-notification` for announcements and absence alerts.

---

## Technical summary

**Files to add**
- `src/components/app-shell/AppScreen.tsx`, `AppSection.tsx`, `AppListItem.tsx`, `BottomTabBar.tsx`
- `src/pages/app/Welcome.tsx` (new `/` when signed out)
- `src/pages/school/Register.tsx`, `Pending.tsx`, `Dashboard.tsx`, `Classes.tsx`, `Students.tsx`, `Teachers.tsx`, `Attendance.tsx`, `Results.tsx`, `Fees.tsx`, `Timetable.tsx`, `Announcements.tsx`
- `src/pages/admin/SchoolApplications.tsx`
- `src/pages/parent/ParentDashboard.tsx`
- `src/lib/school/reportCard.ts` (jsPDF generator)
- `src/config/features.ts` — `{ jamb: false, website: false }`
- `supabase/functions/school-report-card/index.ts`

**Files to change**
- `src/components/layout/AnimatedRoutes.tsx` — new routes, move landing to `/website`, gate JAMB.
- `src/components/layout/DashboardNav.tsx` — add `school_owner`/`teacher`/`parent` role link sets, remove JAMB.
- `src/components/auth/AcademicPathGate.tsx` — exempt school/teacher/parent roles; route school_owner without school to `/school/register`.
- `src/hooks/useAuth.tsx` — extend `AppRole` with `school_owner | school_admin | teacher | parent`.
- `src/pages/onboarding/ChoosePath.tsx` — disable JAMB card, keep University + add "I run a school" entry → `/school/register`.
- `src/index.css` / `tailwind.config.ts` — safe-area utilities, app-screen tokens.
- `robots.txt` — disallow `/website`, `/jamb-*`.

**Database migration (single migration)**
- Extend `app_role` enum with new roles.
- Create the 13 school tables above with RLS policies using a `is_school_member(school_id, role)` SECURITY DEFINER helper.
- Add `school_id` + `class_id` nullable columns to `quizzes` for school-scoped CBT.

**Out of scope for this round**
- Real SMS gateway for absence alerts (email/in-app only for now).
- Online fee collection (record-only, matches Free Access policy).
- Mobile bottom-tab bar for tutor/admin roles (only student/school/teacher/parent get it this round).

---

## Order of implementation
1. App shell + hide website + pause JAMB (small, ships UX change fast).
2. DB migration + roles + school registration + admin approval.
3. School dashboard + classes + students + teachers.
4. Attendance + Results + report card PDF.
5. Fees + Timetable + Announcements.
6. Parent + Teacher dashboards + CBT-into-results wiring.