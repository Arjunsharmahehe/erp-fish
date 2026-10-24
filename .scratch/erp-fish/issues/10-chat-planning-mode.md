# 10: Planning-mode chat

**What to build:** The main `/home` chat interface. Planning mode answers
invoice questions with search/fetch; agent mode creates a job via the
existing orchestrator. Capstone of the MVP.

**Blocked by:** 08-auth-onboarding, 09-app-shell-sidebar.

**Status:** open

**Seam:** D (planning chat) — proposed, confirm before testing. `POST
/api/chat` with a stubbed chat LLM returns the canned answer + citations.
Never assert on prompt wording (mirrors seam A).

**TDD loop:** Red-green with stubbed chat LLM + frozen demo invoice as the
attached context, one behavior at a time.

- [ ] Failing test first: planning answer over an attached invoice cites
  invoice values (supplier/invoice_no/rates from the frozen literal)
- [ ] Failing test first: keys absent → 200 with degraded-notice message,
  tools omitted, no crash
- [ ] Chat UI per `rules/chat.md`: `MessageScroller` + `Message` +
  `Bubble` + `Attachment` + `Marker`; mode `ToggleGroup`
  (planning|agent); `Attachment` → `POST /api/parse` → invoice context card
- [ ] `POST /api/chat { messages, invoice?, mode: "planning" }` reuses the
  OpenAI-compat path; `fetch_url`/`web_search` tools backed by TinyFish
  only (specs/03 §4), omitted without keys; `{ message, citations[] }`
- [ ] Agent mode: composer gathers invoice + instruction → existing
  `POST /api/jobs` → embed/navigate `/home/jobs/[id]`; no new execution
  UI in this ticket (next phase)
- [ ] Threads: server-persisted (confirmed). `chat_threads` +
  `chat_messages` tables, `GET /api/chat/threads` + `GET
  /api/chat/threads/:id`, sidebar lists recent threads; title from first
  user message
