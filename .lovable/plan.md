# Phase 9 — Admin Operations + Opportunity Lifecycle Completion

Phase 8 shipped trust scoring, device audit, tutor announcements and recommended opportunities. Phase 9 closes the loop on what's still half-done: opportunity lifecycle management, admin operational depth, and tutor accountability — without redesigning the app or touching student architecture.

## Goals
1. Make `/opportunities` feel alive (saved, applied, expiring, alerts).
2. Give admins a real operations console (review queue, audit search, trust overrides, broadcast).
3. Hold tutors accountable (scorecards visible to admins, suspend/warn flow).
4. Harden monetization edges discovered in Phase 8 (refund audit, suspicious purchase flagging).

Out of scope: visual redesign, student page restructure, new student features, payments rework.

---

## 1. Opportunity lifecycle (student + admin)
- **Saved tab** on `/opportunities` reading `opportunity_bookmarks` — empty state + count badge on filter rail.
- **Applied tracking**: new `opportunity_applications` table (status: `interested | applied | accepted | rejected`), one-tap "Mark as applied" on `OpportunityDetail`.
- **Deadline alerts**: edge function `opportunity-deadline-reminders` (cron daily) → notification 72h and 24h before deadline for bookmarked items.
- **Auto-archive**: nightly job moves `deadline < now()` to `status = 'archived'`.
- **Admin enhancements** on `/admin/opportunities`:
  - Edit (currently only create/delete).
  - Draft vs published toggle.
  - Per-opportunity application count.
  - Bulk import via CSV.

## 2. Admin operations console
- **New `/admin/audit`**: searchable, paginated `audit_logs` view — filter by action, admin, date range, free-text on `new_data`.
- **New `/admin/trust`**: list users sorted by trust score with filters (low score, many devices, flagged). Inline "force re-verify" and "revoke all sessions" actions backed by RPCs.
- **`/admin/broadcast`**: send platform-wide announcement (uses existing announcements table) with audience filter (all / level / university / tutors).
- **Admin home (`AdminDashboard`)**: add KPI strip — pending tutor apps, low-trust users (24h), open moderation reports, opportunities expiring this week.

## 3. Tutor accountability
- **Admin tutor scorecards** (page exists): wire real signals — student rating avg, response time, completed sessions, refund count, last active. Add Warn / Suspend / Reinstate buttons → write to `audit_logs` and toggle `profiles.tutor_status`.
- **Tutor self-view**: read-only scorecard panel inside `TutorDashboard` so tutors see what admins see.

## 4. Monetization hardening
- **Refund audit table** `refund_events` populated by webhook, surfaced in `/admin/withdrawals` (extend existing page with a "Refunds" tab).
- **Suspicious purchase flagging**: trigger on `token_purchases` insert that flags >3 purchases / 1h / user → admin queue item.
- **Watermark all premium PDF exports**: extend `watermark.ts` usage to the remaining export points (`exportSummaryPdf`, `exportStudyPack`, `reportCard`).

---

## Technical section

**DB migrations (one file)**
- `opportunity_applications` table + RLS (owner read/write, admin read-all).
- `refund_events` table + RLS (admin only).
- Index `audit_logs(action, created_at desc)` for the search page.
- Trigger `flag_suspicious_purchase()` on `token_purchases`.
- RPCs: `admin_revoke_all_sessions(_user_id)`, `admin_set_tutor_status(_user_id, _status, _reason)`, `get_admin_kpis()`.

**Edge functions**
- `opportunity-deadline-reminders` (scheduled).
- Extend `payments-webhook` to write `refund_events` on `transaction.refunded`.

**New pages**
- `src/pages/admin/AdminAudit.tsx`
- `src/pages/admin/AdminTrust.tsx`
- `src/pages/admin/AdminBroadcast.tsx`
- `src/pages/opportunities/SavedOpportunities.tsx` (tab inside existing page, no new route)

**Edited (presentation + small logic)**
- `src/pages/admin/AdminOpportunities.tsx` (edit, draft toggle, app counts, CSV import).
- `src/pages/admin/AdminDashboard.tsx` (KPI strip).
- `src/pages/admin/AdminTutorScorecards.tsx` (real metrics + actions).
- `src/pages/admin/AdminWithdrawals.tsx` (refunds tab).
- `src/pages/opportunities/Opportunities.tsx` (Saved tab + count badge).
- `src/pages/opportunities/OpportunityDetail.tsx` (Mark as applied).
- `src/pages/tutor/TutorDashboard.tsx` (self scorecard).
- `src/lib/exportSummaryPdf.ts`, `src/lib/exportStudyPack.ts`, `src/lib/reportCard.ts` (apply watermark).

**Not touched**
Student dashboard, library, audio learning, course hub, splash, onboarding, auth, chat, sessions, exams, AI flows, tutor curriculum builder.

---

## Acceptance
- Student can save, mark applied, and receive deadline reminders.
- Admin can search audit logs, see trust outliers, broadcast announcements, and act on tutors.
- All premium PDFs carry the user-bound watermark.
- One migration, additive only. No destructive policy changes.

Reply **"go"** to ship Phase 9 end-to-end, or edit the scope first.