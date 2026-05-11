## Goal

Let students upload their own course outlines and study materials into **My Library**, access them on every login, and generate AI flashcards (and more) from any outline. Backend (private `user-resources` bucket + `user_resources` table + RLS) is already in place — this plan focuses on the missing UI + AI features.

## What we'll add

### 1. Direct upload to My Library (`/library`)
- New **"Upload"** button on the Library page header → opens a dialog with:
  - Drag-and-drop zone + file picker (multi-file)
  - Accepted: PDF, DOCX, TXT, MD, JPG/PNG, MP3/WAV (max 20 MB each)
  - **Type tag**: Course Outline / Lecture Note / Past Question / Slides / Other
  - **Course/Folder**: free text with autocomplete from existing folders (e.g. "CSC 201", "MTH 101")
  - Optional title (defaults to filename)
- Auto-detects `kind` from MIME (pdf / image / audio / note) and writes `meta.material_type` for the tag.
- Progress bar per file + toast on completion.

### 2. Mark items as "Course Outline"
- New filter chip **"Outlines"** on Library (uses `meta.material_type = "outline"`).
- Outline cards get a gold accent + a **"Generate Flashcards"** quick action button.

### 3. AI flashcard generation from outline
- New edge function `generate-flashcards-from-resource` (Lovable AI, `google/gemini-2.5-flash`):
  - Input: `resource_id`, `count` (10/20/30), `difficulty` (easy/medium/hard)
  - Server-side: signed-URL fetch the file, extract text (PDF via pdfjs-dist already available client-side — we'll do extraction client-side and POST text to keep edge fn light), send to AI with strict JSON schema (`[{front, back, hint?}]`)
  - Returns the array; client saves it back to the Library as a new `kind: "flashcard"` resource (JSON file) linked via `meta.source_resource_id`.
- Generated flashcards open in a **flip-card study viewer** (new `FlashcardStudyDialog`) with: flip, next/prev, "I knew it" / "Review again", and a **Send to /review (SRS)** button that pushes them into the existing SM-2 review system.

### 4. Bonus features the user asked us to suggest

| Feature | What it does |
|---|---|
| **AI Outline Summarizer** | One-tap: turns an outline into a 1-page study brief saved as a Note. |
| **Topic → Quiz** | Generate a 10-question quiz from any outline topic; auto-saves attempt to history. |
| **Course Hub view** | Group library items by course code (folder) with progress: # outlines, # flashcards, last studied. |
| **Smart Highlights** | After uploading a PDF, AI extracts the top 10 "must-know" bullet points. |
| **Audio version** | One-tap "Listen to this outline" → uses existing Noiz TTS to create an MP3 saved back to Library. |
| **Weekly study plan from outline** | AI splits the outline into a 7-day plan; adds tasks to the existing Exam Readiness weekly plan. |
| **Share with study group** | Send any library item into a `/chat` thread (read-only signed link, 24h). |

### 5. Discoverability
- Add a **"Library + Upload"** tile to the Dashboard QuickActions grid, replacing or sitting next to the existing entry, so first-login students see it immediately.
- Empty-state on `/library` gets a big **"Upload your first course outline"** CTA.

## Technical notes

- **Files touched**
  - `src/pages/student/Library.tsx` — header upload button, outline filter, course-hub toggle
  - `src/components/student/library/UploadResourceDialog.tsx` *(new)*
  - `src/components/student/library/FlashcardStudyDialog.tsx` *(new)*
  - `src/components/student/library/OutlineActionsMenu.tsx` *(new)* — Generate flashcards / Summarize / Quiz / Listen / Plan
  - `src/lib/userResources.ts` — add `material_type` helpers
  - `src/lib/extractText.ts` *(new)* — pdfjs + mammoth + plain-text extraction (libs already in project)
  - `supabase/functions/generate-flashcards-from-resource/index.ts` *(new)*
  - `supabase/functions/summarize-resource/index.ts` *(new)*
  - `supabase/functions/quiz-from-resource/index.ts` *(new)*
  - `src/components/student/StudyPackQuickActions.tsx` — add Library tile
- **No DB migration needed** — `user_resources.meta JSONB` already stores `material_type` and `source_resource_id`. Bucket and RLS already exist.
- **AI**: Uses Lovable AI Gateway (no extra secrets). Strict JSON tool-calling for flashcards/quiz.
- **Auth**: All edge functions validate JWT and check resource ownership before returning content.
- **Mobile-first**: Upload dialog, flashcard viewer and outline menu are designed for 360–420 px Android widths first, then scale up.

## Out of scope (next iteration)
- OCR for scanned image-only PDFs
- Real-time collaborative annotation
- Tutor → student outline assignments (could reuse `tutor_curricula`)

Approve this and I'll implement in one pass, starting with upload + flashcards (the must-haves) and then layering the bonus AI actions.
