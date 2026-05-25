# Phase 3 — Subscriptions, Freemium & Personal Library

Reuses what already exists (`subscription_plans`, `user_subscriptions`, `token_wallets`, `user_resources`, `referral_code` on `profiles`, `referral_rewards`, `date_of_birth`) and layers Phase 3 on top — no rebuilds.

## 1. Database (single migration)

**Plans (seed, idempotent):**
- `free` (0), `weekly` (price_cents 200, interval `week`), `monthly` (700, `month`), `yearly` (6000, `year`). `features` JSON describes unlocked capabilities.

**Manual payment requests:**
```
payment_requests(
  id, user_id, plan_id, amount_cents, currency='NGN',
  reference text, proof_path text,        -- private bucket
  status text default 'pending',          -- pending | approved | rejected
  admin_note text, reviewed_by uuid, reviewed_at, created_at)
```
- Private storage bucket `payment-proofs` (user folder).
- RLS: owner SELECT/INSERT own; admin SELECT/UPDATE all.
- On approve (server-side via SECURITY DEFINER `approve_payment_request(id)`): insert/extend `user_subscriptions` (started_at=now, expires_at=now+interval), mark request approved, notify user.

**Helpers / auto-downgrade:**
- SQL function `public.is_pro(uid)` — true when an active row exists with `expires_at IS NULL OR expires_at > now()`.
- Lightweight trigger on `user_subscriptions` SELECT not possible; instead the client `useIsPro` already checks expiry. Add nightly Edge Function `subscription-sweeper` (pg_cron via existing scheduler if available, else manual) that flips `status='expired'` and sends a notification — purely cosmetic; gating already depends on expiry.

**AI usage tracking (daily limits):**
```
ai_usage_daily(user_id, day date, kind text, count int, primary key (user_id,day,kind))
```
- RPC `increment_ai_usage(_kind text, _limit int)` returns `{ allowed, remaining }`; raises a known error code when over limit so client shows upgrade modal.

**Referral foundation:** `referral_code` and `referred_by` already exist. Add:
- Trigger on `profiles` insert → generate unique 6-char code if null.
- View `referral_stats` (user_id, total_invites, premium_conversions) for UI.

**Wallet transfers (architecture only):**
```
token_transfers(id, from_user, to_user, to_email, amount, status, created_at)
```
- RLS: sender sees own; no transfer RPC yet (deferred), just schema.

**Bookmarks/key-notes:** `student_resource_bookmarks` and `user_resources` already cover this — no new tables.

## 2. Edge functions

- `submit-payment-request` — validates plan + uploads proof reference.
- `approve-payment-request` (admin only) — wraps `approve_payment_request` RPC, sends notification + email via existing Resend.
- `subscription-sweeper` — scheduled daily; marks expired and notifies.

## 3. Frontend

**Premium gating (reusable):**
- `src/hooks/usePremium.ts` — wraps existing `useIsPro`, exposes `requirePremium(featureLabel)`.
- `src/components/premium/UpgradeModal.tsx` — calm white/gold modal, lists plan cards, "Upload payment proof" CTA. Used everywhere AI/audio/advanced quiz limit hits.
- `src/components/premium/PremiumBadge.tsx` — small gold pill.
- `src/lib/aiQuota.ts` — wraps `increment_ai_usage`; called by AI Study Pack, Audio, Library AI before generation. Free tier defaults: 5 AI generations/day, 2 audio/day, 3 advanced quizzes/day.

**Subscription pages:**
- `src/pages/student/Subscription.tsx` (`/subscription`) — current plan card, plan picker, manual-payment dialog (`SubmitPaymentDialog.tsx`) with bank details + reference + proof upload, "Pending review" status, history list.
- Update `src/pages/Pricing.tsx` CTA to route to `/subscription`.

**Admin payments:**
- `src/pages/admin/PaymentRequests.tsx` (`/admin/payments`) — table of pending/all requests, proof preview (signed URL), approve/reject with note, manual "Set plan" override (calls existing admin RLS to upsert `user_subscriptions`).
- Link from existing admin dashboard nav.

**Personal Library upgrade (extends existing `/library`):**
- Reorganize `src/pages/student/Library.tsx` into 6 tabs: Documents, Audio, Flashcards, AI Generations, Key Notes, Offline Downloads (reuses `useUserResources`, `student_resource_bookmarks`, existing `offlineLibraryCache`).
- Add "Save to Library" buttons to: AI study pack output, audio player, quiz explanations, AI summaries (uses existing `SaveToLibraryButton`).
- Empty states + folder filter chips.

**Personalized greeting + birthday:**
- New `src/components/student/dashboard/GreetingBlock.tsx` — "Welcome back, {firstName}" with time-of-day variant; if today is DOB → confetti banner; else show countdown to next birthday when DOB set.
- Slot into existing `TopHeader`/`StudentDashboard` (replaces static greeting only, no layout redesign).

**Referrals (lightweight):**
- `src/pages/student/Referrals.tsx` (`/referrals`) — shows code, copy link button (`/?ref=CODE`), list of invitees + status, tokens earned. Reuses existing `referral_rewards` trigger.
- Auth signup already captures `?ref` → ensure `referred_by` is set if not already.

**Wallet (minimal):**
- `src/pages/student/Wallet.tsx` (`/wallet`) — balance, recent `token_transactions`, "Transfer (coming soon)" disabled stub. No fintech styling — single card.

**Notifications:**
- Update `NotificationCenter` bell icon to render small gold dot when `unread_count > 0` (query already exists in `useNotifications`). Add new notification types for: subscription approved/expired, AI generation complete, referral reward (already partly wired).

**Bottom tab + nav:** no change to the 4 main tabs; new pages are reachable from Dashboard Quick Actions and profile menu.

## 4. Files

**New (~15):**
- `src/hooks/usePremium.ts`, `src/lib/aiQuota.ts`
- `src/components/premium/UpgradeModal.tsx`, `PremiumBadge.tsx`
- `src/components/student/dashboard/GreetingBlock.tsx`
- `src/components/subscription/SubmitPaymentDialog.tsx`, `PlanCard.tsx`
- `src/pages/student/Subscription.tsx`, `Referrals.tsx`, `Wallet.tsx`
- `src/pages/admin/PaymentRequests.tsx`
- `supabase/functions/submit-payment-request/index.ts`
- `supabase/functions/approve-payment-request/index.ts`
- `supabase/functions/subscription-sweeper/index.ts`
- one new migration

**Edited (~8):**
- `src/pages/student/Library.tsx` (tabs + key notes)
- `src/pages/student/StudentDashboard.tsx` + `TopHeader.tsx` (greeting)
- `src/components/layout/AnimatedRoutes.tsx` (3 new routes + admin route)
- `src/components/notifications/NotificationCenter.tsx` (unread dot)
- `src/pages/Pricing.tsx` (CTA → /subscription)
- AI/audio call sites that should enforce free quota: `study-hub/MaterialAIPanel.tsx`, `audio/SpeakButton.tsx`, `lib/libraryAI.ts`
- `src/components/student/dashboard/QuickActionsGrid.tsx` (add Library/Wallet/Referrals tiles if room)

## 5. Out of scope (do not touch)

- Onboarding, course architecture, dashboard layout (Phase 1/2 deliverables stay frozen).
- Real card/Paddle integration — payments remain manual this phase.
- Token-to-token transfer RPC (schema only).
- Offline sync engine rewrite — keeps existing `offlineLibraryCache`.

Awaiting approval to switch to build mode.
