## Phase 5 — Chat, Brainstorming Rooms & @AI

Goal: give students and tutors a lightweight realtime chat layer with **@AI mentions** that let Lovable AI join any thread on demand, plus dedicated **Brainstorm Rooms** scoped to a Study Pack or a Tutor Curriculum.

### What ships

1. **Threads** (1:1 DM, group chat, brainstorm room)
2. **Messages** with realtime delivery
3. **@AI mentions** → triggers `chat-ai-reply` edge function that posts an assistant message back into the thread, streaming
4. **Brainstorm Rooms** auto-created from a Study Pack (student) or a Tutor Curriculum (tutor) — invite by code
5. **Inbox** page listing threads, plus an in-context **"Brainstorm" tab** inside Study Pack and Tutor Curriculum pages

### Database (single migration)

```text
chat_threads
  id, kind ('dm'|'group'|'brainstorm'),
  title (nullable), context_kind ('study_pack'|'tutor_curriculum'|null),
  context_id (uuid|null), invite_code (nullable for brainstorm),
  created_by, created_at, updated_at

chat_thread_members
  thread_id, user_id, role ('owner'|'member'),
  last_read_at, joined_at  (PK: thread_id+user_id)

chat_messages
  id, thread_id, author_id (nullable for AI), is_ai bool,
  content text, meta jsonb, created_at
```

RLS: members can read/post in threads they belong to; brainstorm threads readable by anyone with the invite code via a lightweight RPC `join_brainstorm(code)`.

Realtime: enable publication for `chat_messages` and `chat_thread_members`.

### Edge function

`chat-ai-reply` — input `{ thread_id, prompt, context }`. Loads last ~20 messages, calls `google/gemini-3-flash-preview` via Lovable AI, streams response, then inserts the final assistant message row (so realtime fans it out to all members). Triggered when a posted message contains `@AI`.

### UI

- `src/hooks/useChatThreads.ts` — list threads, unread counts
- `src/hooks/useChatMessages.ts` — realtime subscription + send
- `src/pages/chat/Inbox.tsx` — replaces existing `pages/messages/Inbox.tsx` skeleton with full thread list + new-DM dialog
- `src/pages/chat/ThreadView.tsx` — message list, composer, @-mention helper, AI typing indicator
- `src/pages/chat/BrainstormRoom.tsx` — same view + topic header + invite code share
- `src/components/chat/MessageBubble.tsx`, `MentionInput.tsx`, `AiTypingDots.tsx`
- Hooks into Study Pack page ("Open Brainstorm Room" button) and Tutor Curriculum builder ("Open Discussion" button)
- Bottom tab "Inbox" badge shows unread

### Out of scope (defer)

- File attachments in chat (text only this round)
- Voice notes
- Reactions / threading replies
- Push notifications for new messages (we'll use existing notifications row for @mentions only)

After approval I'll: run the migration → wire RLS → build the edge function → ship UI in one pass.

&nbsp;

I want theme to be able to get notifications when they have new response you get 