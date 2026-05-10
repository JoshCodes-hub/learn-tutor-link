# OverraPrep AI — Full Upgrade Roadmap

This is a sequenced 9-phase plan. Each phase is independently shippable and reversible. We will execute one phase per follow-up message so the live app keeps working between deploys. The locked white + gold + Inter system stays untouched globally.

## Cross-cutting decisions (locked now)

- **Audio engine (recommended hybrid):** Keep Overra HF Space as the primary high-quality voice. If it's warming/fails after one quick retry, fall back automatically to the browser `SpeechSynthesis` API (free, instant, offline-capable) so audio NEVER blocks the user. Best of both — premium voice when ready, never a dead button.
- **Quick tray:** Replace `FeatureGrid` with 6 large rounded category icons (Practice / Learn / Tutors / Wallet / Community / More). Each opens a shadcn `Sheet` (bottom-sheet on mobile) listing its sub-features.
- **Resource Library storage:** Private Supabase Storage bucket `user-resources`, folder-per-user with strict RLS (`auth.uid()::text = (storage.foldername(name))[1]`).
- **Build order rule:** No phase touches the splash, auth, payments webhook, or admin RLS unless the phase is explicitly about that area.

---

## Phase 1 — Dashboard restructure + Opay-style quick tray

Goal: turn the home dashboard into a calm command center.

- New `QuickTray` component with 6 icon tiles → opens `CategorySheet` (shadcn Sheet, side="bottom") containing grouped sub-feature lists (Practice, Learn, Tutors, Wallet, Community, More).
- Refactor `StudentDashboard.tsx`:
  - Header: greeting + streak chip + bell + avatar (already partly there).
  - Hero: keep `DashboardHero` but reframe copy around **Study Pack AI** with two CTAs (Upload Document / Paste Notes) that route to the Study Pack flow.
  - Replace `<FeatureGrid />` with `<QuickTray />`.
  - Keep "Continue Learning", motivational quote, "Top Scholars", "Recent Study Packs" as-is.
- Bottom nav (`BottomTabBar`): standardize to **Home · Practice · Audio · Chat · Profile** with larger 28px icons and bigger touch targets.
- No backend changes.

Files: `src/components/student/QuickTray.tsx` (new), `src/components/student/CategorySheet.tsx` (new), edits to `StudentDashboard.tsx`, `BottomTabBar.tsx`. Retire `FeatureGrid.tsx` (delete after Phase 1 ships clean).

---

## Phase 2 — Study Pack AI + Audio reading assistant (hybrid TTS)

Goal: make Study Pack the soul of the app, with reliable audio.

- Keep the existing `process-study-material` edge function (Summary / Key Points / Flashcards / Likely Q) — already working.
- New **AI Chat With Notes** tab inside `MaterialAIPanel`: streaming chat against the material text via Lovable AI Gateway (`google/gemini-3-flash-preview`) — new edge function `chat-with-notes`.
- **Audio overhaul** (`OverraAudioSuite` + `pages/student/AudioLearning.tsx`):
  - New helper `src/lib/tts.ts` with `speak(text, opts)` that:
    1. Tries `overra-tts` edge function (1 retry on `warming_up`, 5s).
    2. On failure or 2nd warming response → falls back to `window.speechSynthesis` chunked by sentence (handles >200-char limit, auto-resume on Chrome bug).
  - Player keeps wavesurfer waveform when MP3 is available; switches to a "live speech" minimal player (progress by sentence index) when on browser TTS.
  - Active-paragraph highlight + auto-scroll for both modes.
  - **Focus music** mixer (lo-fi / rain / piano / nature / library) bundled in `src/assets/audio/`. Independent volume; auto-ducks to 40% on speech start.
  - **Save to Library** button → uploads MP3 (only when Overra produced one) to `user-resources/<uid>/audio/...` (Phase 3 bucket).
- Drop the broken ngrok endpoint paths everywhere.

---

## Phase 3 — Personal Resource Library

Goal: permanent, WhatsApp-style storage.

- DB: new `user_resources` table (`user_id`, `kind` enum: pdf/image/note/flashcard/study_pack/audio, `title`, `folder`, `storage_path`, `mime`, `size_bytes`, `meta jsonb`, timestamps). RLS: owner-only CRUD.
- Storage: private bucket `user-resources` with per-user folder RLS.
- New page `/library` with: folder sidebar, search, filter chips by kind, grid view, in-app preview (PDF.js for PDFs, audio player for MP3).
- "Save to Library" wired from Study Pack, Audio Suite, and (Phase 4) Tutor materials.
- Nothing downloads to device storage; in-app playback/preview only.

---

## Phase 4 — Tutor system expansion

Goal: tutors run their own academic shop.

- Tutor Dashboard upgrade: KPI cards (students, paid students, earnings, weekly engagement) using existing analytics tables.
- **Dynamic course builder**: `tutor_courses` → `tutor_topics` → `tutor_topic_materials` (PDFs, notes, flashcard sets, quiz cards). New tables + RLS.
- AI flashcard generation from uploaded material (reuse `process-study-material` with `kind=flashcards`).
- Student-side tutor browse already exists — add Follow + tutor-community deep-link from each profile (`tutor_communities` already in DB).

---

## Phase 5 — Chat + Brainstorming + @AI

Goal: real-time academic conversation.

- DB: `chat_threads` (kind: dm/course/community), `chat_messages` (with `mentions text[]`), realtime publication.
- New `/chat` shell with thread list + message view, emoji reactions, timestamps, persistent history.
- `@AI` mention in any message triggers a server-side reply via `community-ask-ai` edge function (already exists) and posts an AI message into the thread.
- Reuse existing `team_messages` patterns and `useTutorCommunity`.

---

## Phase 6 — Subscription + Wallet + Referrals

Goal: monetization without breaking current Paddle token flow.

- Keep current Paddle token packs (locked). Add **Subscription Plans** (Weekly / Monthly / Yearly) as new Paddle prices; webhook handles new event type and writes to `subscriptions` table.
- Phase-1 manual payments path: `manual_payments` table + admin approval UI for regions without Paddle.
- Wallet page: balance, transaction history (`token_transactions`), referral earnings, **Transfer tokens by email** edge function (`transfer-tokens`, atomic debit/credit + notification).
- Referral logic: extend `complete_referral_reward` trigger to also fire on first subscription purchase.

---

## Phase 7 — Leaderboard + Engagement

- Leaderboard page tabs: Top Students / Top Tutors (XP, streak, accuracy, engagement score).
- Daily motivational quotes (already on dashboard) + push notifications via existing `send-push` function.
- Streak reminders (already scheduled); add 3/7/14/30-day milestone toasts on dashboard.

---

## Phase 8 — Security + Content protection

- **Single active session**: `active_sessions` table; on login, invalidate previous session token; client listens via realtime and force-logs-out the old tab.
- **No external downloads**: remove all `<a download>` and blob URLs from material/audio views; library is read/preview-only.
- **Watermarks**: all tutor PDFs rendered through PDF.js with a diagonal `OverraPrep · {studentEmail}` overlay.
- **Screenshot protection**:
  - Native (Capacitor): add `FLAG_SECURE` plugin call in `capacitor.config.ts` lifecycle.
  - Web: best-effort — blur on `visibilitychange`/window-blur for material previews.

---

## Phase 9 — Admin control system

- Extend AdminDashboard tabs: Users, Tutors, Manual Payments approval, Admin invites, Content moderation, Reports & Complaints, Engagement monitor.
- New `admin_invites` table + edge function to bootstrap additional admins by email.
- All destructive actions go through existing `log_admin_action` for audit trail.

---

## Technical notes

- All AI text generation routes through Lovable AI Gateway (`LOVABLE_API_KEY` already set). Default model `google/gemini-3-flash-preview`.
- React Query `staleTime: 60_000` everywhere; Supabase Realtime for chat, library updates, leaderboard.
- All new tables get RLS at creation; storage buckets get path-prefix policies.
- Each phase ends with: build passes, manual smoke test of touched flows, memory updated.

```text
Phase order:  1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9
Reversibility: each phase is a feature flag or additive table; no destructive migrations.
```

---

## What I'll do first when you approve

Implement **Phase 1** end-to-end (QuickTray + CategorySheet + dashboard refactor + bottom-nav polish), verify in preview, then ping you to greenlight Phase 2.
