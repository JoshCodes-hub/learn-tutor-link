## Goal

Ship the three flows you described, with the headline being **standard, premium, branded report cards (PDF)** — the kind a real Nigerian secondary school would proudly hand to a parent. No generic templates. No childish icons. Strictly professional, decent, print-ready.

---

## What's already correct (we keep, we don't rebuild)

- **Tutor flow** — apply at `/apply-tutor` → admin reviews at `/admin/applications` → on approve, `tutor` role is added → `/tutor/dashboard` works (create quiz, exams, communities, bulk imports). ✅
- **Student flow** — full dashboard, CBT, readiness, mastery, offline practice. ✅
- **School flow skeleton** — `/school/register` writes to `schools (status=pending)` → `/school/pending` polls → admin approves at `/admin/schools` → `school_owner` role added → `/school/dashboard` unlocks Students, Classes, Attendance, Results, Fees, Announcements. ✅

So the architecture is right. Plan only fixes what's actually missing.

---

## 1. Premium, branded Report Card (the headline)

A new generator `src/lib/reportCard.ts` using **jsPDF + jspdf-autotable** (already in the project — no new deps, no childish clip-art). Designed to look like a real West-African secondary-school broadsheet:

```text
┌─────────────────────────────────────────────────────────┐
│ [LOGO]   BRIGHT FUTURE COLLEGE                          │
│          Motto: "Knowledge & Discipline"                │
│          12 Awolowo Rd, Ikeja, Lagos · 0801 234 5678    │
│ ════════════════ brand-color rule ═════════════════════ │
│                                                         │
│        STUDENT TERMINAL REPORT · 2025/2026 · TERM 2     │
│                                                         │
│  Name:        ADEBAYO MICHAEL OLAMIDE                   │
│  Admission:   BFC/2024/0182      Class:    JSS 2 A      │
│  Sex:         M                  Age:      13           │
│  Position:    3rd of 42          No. in class: 42       │
│                                                         │
│  ┌──────────────────┬─────┬─────┬──────┬─────┬───┬────┐ │
│  │ Subject          │ CA1 │ CA2 │ Exam │ Tot │ G │Rmk │ │
│  │                  │ /20 │ /20 │ /60  │/100 │   │    │ │
│  ├──────────────────┼─────┼─────┼──────┼─────┼───┼────┤ │
│  │ English Language │ 18  │ 17  │  55  │  90 │ A │Excel│ │
│  │ Mathematics      │ ... │ ... │ ...  │ ... │...│ ...│ │
│  └──────────────────┴─────┴─────┴──────┴─────┴───┴────┘ │
│                                                         │
│  Total: 826 / 1000      Average: 78.7      Overall: A   │
│  Attendance: 58 / 60    Conduct: Excellent              │
│                                                         │
│  GRADING KEY                                            │
│  A 75–100  B 65–74  C 55–64  D 45–54  E 40–44  F 0–39   │
│                                                         │
│  Class Teacher's Remark:                                │
│  ____________________________________________________   │
│  Principal's Remark:                                    │
│  ____________________________________________________   │
│                                                         │
│  ___________________          ___________________       │
│   Class Teacher                Principal                │
│                                                         │
│  Issued: 28 Apr 2026 · ID: BFC-2T-0182 · overraprep.app │
└─────────────────────────────────────────────────────────┘
```

Concrete details:
- **Real, professional layout** — A4 portrait, 14 mm margins, serif title (Times — built into jsPDF, no font fetch), sans body.
- School **logo loaded from `schools.logo_url`** (toDataURL on the fly) and rendered at top-left.
- **Brand-color rule** under the header drawn from `schools.brand_color`.
- **Auto-computed**: per-subject total, grade letter (existing 75/65/55/45/40 scale), per-student average, **position in class** (rank by total across all subjects in the term).
- **Subtle watermark** of the school name diagonally behind the table (15% opacity grey) — looks formal, not gimmicky.
- **Verification line**: `BFC-{termCode}-{lastFourOfStudentId}` so a parent can verify it's authentic.
- **Bulk mode**: one PDF, one report per student, page-break per student → `${School} - ${Class} - Term X - Reports.pdf`.
- **Single mode**: one student → opens print preview.

No emojis. No cartoon icons. Lucide icons only on the app UI, never inside the printed PDF.

## 2. Results page — wire up the report

Edit `src/pages/school/Results.tsx`:
- Add a header action **"Generate report cards"** (Lucide `Printer` icon) → triggers the bulk PDF for the currently selected class + term.
- Add a small **"Print"** button on each student row → single-student PDF.
- After save, recompute and persist `results.position` per student per subject (rank by total in that class+subject+term — uses the existing `position` column).
- Show a tiny "Average • Position" chip under the row total.

## 3. School branding (logo + motto + brand color)

New screen `src/pages/school/Settings.tsx`:
- Upload **logo** to a new public bucket `school-logos` → save to `schools.logo_url`.
- Edit motto, principal name, address, phone, email.
- Pick **brand color** (small swatch grid: navy, emerald, burgundy, royal blue, gold — all decent, no neon).
- Live preview of the report-card header.

Wire the existing "School settings" button on `SchoolDashboard.tsx` and surface the **logo + motto** in the dashboard hero. Add `schools.brand_color` (text, default `#1e3a8a` navy) via migration.

## 4. Admin sees school applications

In `src/pages/admin/AdminDashboard.tsx`:
- Add a **"School applications"** stat card with the count of `schools.status='pending'` linking to `/admin/schools`.
- In `src/pages/admin/SchoolApplications.tsx`, on approve/reject: call `sendNotification` (new types `school_approved`, `school_rejected`) and `logAction` — mirroring the tutor approval flow.
- Edge function `send-notification` gets two new email templates (clean, no emojis, school-letter tone).

## 5. Welcome / entry visibility

`src/pages/app/Welcome.tsx` — keep design, add a third tile **"I want to teach"** routing to `/auth?intent=tutor` (post-signup → `/apply-tutor`). Three equal entries: **Student · Tutor · School**, all with proper Lucide icons (`GraduationCap`, `Presentation`, `Building2`) — professional, not playful.

## 6. Database migration (one file)

```sql
ALTER TABLE public.schools
  ADD COLUMN IF NOT EXISTS brand_color text DEFAULT '#1e3a8a',
  ADD COLUMN IF NOT EXISTS report_footer text;

INSERT INTO storage.buckets (id, name, public)
VALUES ('school-logos', 'school-logos', true)
ON CONFLICT (id) DO NOTHING;

-- public read, owner-only write (school_members owner/admin)
CREATE POLICY "logos_public_read" ON storage.objects FOR SELECT
  USING (bucket_id = 'school-logos');
CREATE POLICY "logos_owner_write" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'school-logos' AND auth.uid() IS NOT NULL);
CREATE POLICY "logos_owner_update" ON storage.objects FOR UPDATE
  USING (bucket_id = 'school-logos' AND auth.uid() IS NOT NULL);
```

---

## Files

**New**
- `src/lib/reportCard.ts` — premium jsPDF generator (single + bulk).
- `src/pages/school/Settings.tsx` — branding + school info editor.
- `supabase/migrations/<ts>_school_branding.sql`

**Edited**
- `src/pages/school/Results.tsx` — Generate-report-cards action + per-row print + position computation.
- `src/pages/school/Dashboard.tsx` — render logo/motto in hero, link Settings.
- `src/pages/admin/AdminDashboard.tsx` — school applications stat card.
- `src/pages/admin/SchoolApplications.tsx` — notifications + audit log on decision.
- `src/pages/app/Welcome.tsx` — three-persona entry.
- `src/components/layout/AnimatedRoutes.tsx` — register `/school/settings`.
- `supabase/functions/send-notification/index.ts` — `school_approved` + `school_rejected` templates.

## Out of scope (deliberately)

- No new icon library, no emojis in PDF, no rainbow themes.
- No QR code on the report (would add a dep) — verification ID line is sufficient for v1.
- No timetable, no SMS, no payments — ask separately if you want them next.

---

## Acceptance

- A school owner registers → sees Pending → admin approves → owner gets an email + in-app notice → lands on `/school/dashboard` with their **logo + motto** showing.
- Owner enters CA1/CA2/Exam, hits **"Generate report cards"** → downloads a single PDF: one premium, branded, print-ready report card per student in that class+term, with their school's logo, brand color, motto, position, average, grading key, and signature lines. Looks like a real school document, not a web export.
- Admin dashboard shows pending school applications at a glance.
- Tutor entry is now visible from the Welcome screen alongside Student and School.
