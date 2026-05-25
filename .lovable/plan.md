## Phase 4 — AI Study System, Audio Learning & Exam Readiness

Most of the Phase 4 infrastructure is **already built** in prior phases:

- `runLibraryAI` (summary/flashcards/quiz, with cancel via `AbortSignal`, history logging) — `src/lib/libraryAI.ts`
- `ai_generation_history` table + UI (`AIHistory.tsx`, `GenerationHistoryPanel.tsx`) with filters, delete, clear-all confirmation, CSV export
- Browser-native TTS engine (`browserTts.ts`) + Audio Learning page with chunking, sections, bookmarks, resume, ambient music
- Exam Readiness Engine (`examReadiness.ts`) with 5 weighted signals + per-course breakdown
- `extractTextFromFile` for PDF / DOCX / TXT
- Personal Library with Save-to-Library, offline downloads

This phase **does not rebuild** any of that. It closes the remaining gaps to make the system feel *course-aware* and *exam-ready*.

---

### 1. Course-aware AI scoping (DB)

Single migration:

- Add `course_id uuid`, `topic_id uuid` (both nullable) to `public.ai_generation_history`, indexed.
- Add same two nullable columns to `public.user_resources` so AI outputs and uploads can belong to a course.
- New RPC `list_course_ai_generations(course_id uuid)` returning current user's history scoped to a course.

`logAIGeneration` and `runLibraryAI` will accept optional `courseId` / `topicId` and persist them. Existing resource-only flow keeps working.

### 2. Course Hub: AI Packs + Audio tabs become real

`src/pages/courses/CourseHub.tsx`

- **AI Packs tab**: replace the stub with `<CourseAIPanel courseId topicId={topicFilter} />` — new component that:
  - Lists this course's `lecture_notes` (already fetched) as pickable source documents.
  - Per-document action buttons: Summary, Flashcards, Practice quiz — call `runLibraryAI` and persist with `course_id`/`topic_id`.
  - Inline `<GenerationHistoryPanel>` (existing) filtered by the picked document, plus a course-wide history strip using the new RPC.
  - In-flight rows show **Cancel** + post-failure **Retry**.
- **Audio tab**: replace the stub with `<CourseAudioPanel courseId>` — list this course's documents with a "Listen" button that opens `/audio-learning?source=lecture_note:<id>`. `AudioLearning.tsx` gains a small effect that, when this query param is present, fetches the doc, extracts text, and pre-fills.

### 3. AI Quiz one-click flow + Review Mode

- New page `src/pages/student/AIQuizRunner.tsx` route `/ai-quiz/:resourceId`:
  - Loads `user_resources` row of kind `note` with `material_type: "quiz"` (already saved by `runLibraryAI`).
  - Renders questions one-at-a-time with clear blocks: question / options / selected / correct answer / explanation.
  - On finish → Review Mode (all questions, correct/incorrect highlighted, explanations expanded).
  - On completion writes a row to `quiz_attempts` (course_id/quiz_id null, source=`ai_resource:<id>`) so readiness picks it up.
- `OutlineActionsMenu` quiz output → "Open quiz" navigates here instead of just toasting.

### 4. Better PDF extraction

Upgrade `src/lib/extractText.ts`:

- For PDFs: track `transform[5]` (y position) and font height per text item; insert `\n\n` on large y-jumps and `# ` prefix for items whose font size is markedly above the page median. Keeps everything client-side, no new deps.
- Increase default `maxPages` from 40 → 80 with a soft cap option.
- Add an OCR-not-supported toast hint when extracted text < 50 chars on a PDF (so students know why it failed).

### 5. Flashcard completion → readiness signal

- `src/components/courses/CourseProgressCard.tsx` already surfaces `cardsReviewed/totalFlashcards`. Add a small `FlashcardProgressStrip` to the Course Hub flashcards tab showing % complete and a "Continue review" button to `/review?course=<id>`.
- No engine change needed — `flashcard_mastery` already weighted 20% via SRS.

### 6. AI chat formatting + notification bell

- Wrap all AI chat message bodies (`ai-tutor-chat`, `chat-with-notes`, `library-ai` summaries previewed in chat) in `ReactMarkdown` and run text through existing `sanitizeAIText` so bold/headings/lists render cleanly and `***` noise is stripped. Files touched: `src/components/chat/MessageBubble.tsx`, `src/pages/ai-tutor/AITutor.tsx` rendering block only.
- `TopHeader.tsx` notification bell: subscribe to `notifications` realtime channel so the unread dot updates without refresh, and call the existing `useNotifications` invalidation when `library_ai_completed` / `audio_generated` analytics events fire (via simple custom event bus).

### 7. Out of scope (per phase rules)

- Dashboard redesign, onboarding, subscriptions, payments — untouched.
- Server-side OCR — flagged via UI hint only.
- Paid TTS — browser SpeechSynthesis remains primary; existing `text-to-speech` edge function stays available as opt-in but not wired into the default flow.

---

### Files to create

- `supabase/migrations/<ts>_course_aware_ai.sql`
- `src/components/courses/CourseAIPanel.tsx`
- `src/components/courses/CourseAudioPanel.tsx`
- `src/components/courses/FlashcardProgressStrip.tsx`
- `src/pages/student/AIQuizRunner.tsx`

### Files to edit

- `src/lib/libraryAI.ts` — accept `courseId` / `topicId`
- `src/lib/aiGenerationHistory.ts` — pass through scope columns, new `listCourseAIGenerations`
- `src/lib/extractText.ts` — heading/paragraph preservation
- `src/pages/courses/CourseHub.tsx` — swap AI Packs + Audio tabs
- `src/pages/student/AudioLearning.tsx` — `?source=lecture_note:<id>` pre-fill
- `src/components/student/library/OutlineActionsMenu.tsx` — open quiz route
- `src/components/chat/MessageBubble.tsx`, `src/pages/ai-tutor/AITutor.tsx` — markdown render + sanitize
- `src/components/student/dashboard/TopHeader.tsx` — realtime notification dot
- `src/components/layout/AnimatedRoutes.tsx` — register `/ai-quiz/:resourceId`

### Expected outcome

Every AI output is attached to its university course + topic. From any Course Hub a student can generate a summary, flashcards, or a practice quiz from real lecture notes, listen to those same notes via browser TTS, see the generation history scoped to that course, cancel/retry mid-flight, and watch the Exam Readiness signal move as they review.
