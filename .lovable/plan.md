## Goal
Extend OverraPrep with a course-centric content architecture, improve the Library, upgrade AI generation UX, and add generation history + cancellation — without rebuilding existing features.

## 1. Course-Centric Architecture

### Data model (migration)
Reuse existing `courses` and `topics`. Add light linkage so content can be filtered per course:
- `courses`: add `code` (e.g. GNS101), `cover_url`, `created_by` (tutor), `is_published` (already exists if present — verify).
- `topics`: ensure `course_id` FK exists.
- `lecture_notes` / tutor materials: ensure `course_id` and optional `topic_id`.
- `flashcard_decks` (new if missing): `id, course_id, topic_id?, title, owner_id, visibility`.
- `flashcards`: `deck_id, front, back, order_index`.
- `quizzes`: already has `course_id` — confirm + add `topic_id` nullable.
- `course_images` (new): `course_id, topic_id?, url, caption, uploaded_by`.
- RLS: tutors manage their own; students read published/approved.

### Routes
- `/courses` — searchable course directory (students + tutors).
- `/courses/:courseId` — Course Hub with tabs:
  - Overview, Documents/PDFs, Flashcards, Quizzes, Images/Materials, AI Study Packs.
- `/tutor/courses` — tutor's courses list with "New Course" CTA.
- `/tutor/courses/:courseId/manage` — manage topics + upload tabs (documents, flashcards, quizzes, images).

### Components
- `CourseHubLayout` (tab nav, header with code/title/cover).
- `CourseDocumentsTab`, `CourseFlashcardsTab`, `CourseQuizzesTab`, `CourseImagesTab`, `CourseStudyPacksTab`.
- `TutorCourseEditor` (create course, add topics, upload to each tab).
- Keep existing pages working; add deep-links from old listings to the new hub.

## 2. Library Improvements
- Tutor materials surfaced inside Library with Open/View/Download actions (reuse existing viewer).
- "Offline Ready" badge driven by `offlineLibraryCache.isCached(resourceId)` after cache completes.
- Persistent saved items: already in `saved_resources`; ensure tutor materials auto-link when saved.

## 3. AI Generation Upgrades

### Structured quiz output
- Update `library-ai` / quiz generation prompt + JSON schema to enforce:
  `{ question, options[4], correct_index, explanation, difficulty }`.
- Render in a clean card with Question → Options → Correct Answer → Explanation.
- After generation, open a **Review Mode** screen showing all Q/A before saving or starting practice.

### Generation history
- New table `ai_generation_history`:
  `id, user_id, resource_id, kind (quiz|flashcards|summary|audio), output_ref, status, created_at, params jsonb`.
- UI panel on Library item + Study Packs: list past generations with **Quick Open**, **Re-run**, timestamp.

### Cancel generation
- Wire `AbortController` through `OutlineActionsMenu` + `libraryAI` calls.
- Progress dialog gains a **Cancel** button that aborts the fetch and marks history row `cancelled`.

## 4. UI/UX
- White + gold tokens (existing). Use `.ai-prose` for AI output.
- Mobile-first: tab bar scrolls horizontally on `/courses/:id`.
- Large icon cards on Course Hub tabs.
- No global restyle — only new screens + small badge/button additions.

## Technical sections

### Files to add
- `supabase/migrations/<ts>_course_architecture.sql`
- `src/pages/courses/CourseDirectory.tsx`
- `src/pages/courses/CourseHub.tsx` + tab components in `src/components/courses/`
- `src/pages/tutor/TutorCourseEditor.tsx`
- `src/pages/quiz/QuizReviewMode.tsx`
- `src/components/ai/GenerationHistoryPanel.tsx`
- `src/lib/aiGenerationHistory.ts`

### Files to edit
- `src/components/layout/AnimatedRoutes.tsx` — new routes
- `src/components/student/library/OutlineActionsMenu.tsx` — abort + history logging
- `src/lib/libraryAI.ts` — AbortSignal support, structured quiz schema
- `supabase/functions/library-ai/index.ts` — schema enforcement, abort-friendly
- `src/pages/student/Library.tsx` — Offline Ready badge, tutor-material actions
- Tutor dashboard nav — link to `/tutor/courses`

### Out of scope (kept as-is)
- Existing AI prose typography, splash, audio mini player, payments.
- Existing global pages (Study Packs, AI Tutor) — only add deep links into course hub.
