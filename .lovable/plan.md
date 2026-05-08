
## Overra AI Elite 8 — Audio Suite Plan

A new premium audio experience that replaces the current `StudyPackAudioPlayer` inside the Study Pack → **Audio** tab (`MaterialAIPanel`). It uses the same backend (`https://urgency-company-bonfire.ngrok-free.dev/tts`) but adds waveform visuals, dialogue voices, a lo-fi music mixer, synced text highlighting, and click-to-narrate paragraphs.

---

### 1. New component: `OverraAudioSuite`

Location: `src/components/study-hub/OverraAudioSuite.tsx`

Props:
- `text: string` — the Summary text
- `fileName?: string` — for downloads

Replaces `<StudyPackAudioPlayer />` in `MaterialAIPanel` (Audio tab). The old component file stays for now in case we revert.

---

### 2. Visual design — Midnight Navy + Burnished Gold

A scoped premium theme inside the player only (won't disturb the global white/gold system locked in memory):

- Surface: deep midnight navy gradient (`#0B1426 → #0F1B33`)
- Accent / waveform progress / highlight: Burnished Gold (`#C9A96E` → `#E8C77A`)
- Idle waveform: muted slate
- Typography: existing Inter; numerals tabular
- Soft inner glow + thin gold border, rounded-3xl

All values added as CSS vars on the component root so the rest of the app stays untouched.

---

### 3. Player core (wavesurfer.js)

- Add dependency `wavesurfer.js`
- Build canvas-style waveform with gold progress, navy base
- Custom controls (no native `<audio>` UI):
  - Play / Pause (large gold circular button)
  - ±10s seek
  - Progress = wavesurfer seek
  - Time display `current / duration`
- Speed control segmented pill: `0.5x · 1x · 1.5x · 2x` → `wavesurfer.setPlaybackRate()`
- Download `.mp3` button (uses the cached blob URL)

---

### 4. Dialogue Mode toggle

Segmented switch:
- **Standard** → `GET /tts?text=…`
- **Lecturer** → `GET /tts?text=…&voice=lecturer`

Switching voice while audio exists prompts a one-tap "Regenerate in Lecturer voice" action (so we don't silently re-bill the backend).

---

### 5. Study Vibes — Lo-Fi background mixer

- Independent `<audio loop>` element for a lo-fi track
- Toggle: Off / Lo-Fi
- Volume slider (0–100, default 25%)
- Plays/pauses in sync with the main narration (when narration pauses, music ducks to 40% of its set volume; resumes on play)
- Track: bundled royalty-free loop at `src/assets/audio/lofi-study.mp3` (placeholder; user can swap)

---

### 6. Text Sync — Burnished Gold highlight + auto-scroll

- Split summary into sentences (regex on `.?!` with abbreviation guard)
- Estimate per-sentence duration proportional to character count vs total audio `duration`
- On `timeupdate`, compute active sentence index → wrap in `<mark>` styled with gold background + navy text
- Active sentence auto-scrolls into view (smooth, `block: 'center'`) inside a scrollable transcript panel

This is an approximation (backend doesn't return word timings); good enough for a premium feel and clearly documented in code.

---

### 7. Section-to-Speech

- Same sentence/paragraph split renders as a clickable transcript
- Click a paragraph → fetches `/tts?text=<paragraph>&voice=<current>`, returns mini inline player (play/pause + download) under that paragraph
- Independent of the main narration; only one section plays at a time
- Cached per-paragraph blob URL so re-clicks don't re-fetch

---

### 8. Network & UX hardening

- All fetches send `ngrok-skip-browser-warning: true`
- Trim `text` to 5000 chars (matches existing limit)
- Loading: skeleton waveform + shimmer
- Errors: `sonner` toast with retry
- Cleanup `URL.revokeObjectURL` on unmount and on regenerate

---

### 9. Integration touch-points

- `src/components/study-hub/MaterialAIPanel.tsx` — swap `<StudyPackAudioPlayer />` for `<OverraAudioSuite />` in the Audio tab; pass Summary text + material title
- `package.json` — add `wavesurfer.js`
- `src/assets/audio/lofi-study.mp3` — placeholder loop asset

No backend / Supabase / DB changes. No global theme changes.

---

### Out of scope (intentionally)

- Real word-level karaoke timing (backend doesn't expose timestamps)
- Saving generated MP3s to Supabase Storage
- Multiple lo-fi tracks (single track now; easy to extend later)
- Mobile background playback via Capacitor

---

### Technical notes

```text
OverraAudioSuite
├── Header (title, dialogue toggle)
├── Waveform (wavesurfer.js)
├── Transport (seek-10, play/pause, seek+10)
├── Meta row (speed pills · time · download)
├── Vibes row (Lo-Fi toggle + volume)
└── Transcript
    ├── Sentence spans (gold highlight on active)
    └── Paragraph blocks (click → /tts → inline mini player)
```

Audio graph: two independent `HTMLAudioElement`s (narration via wavesurfer's internal media, lo-fi via plain `<audio>`); ducking handled by listening to wavesurfer `play`/`pause` events.
