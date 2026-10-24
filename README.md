# erp-fish

Bun monorepo: `apps/web` (Next.js) + `apps/api` (Hono) + `packages/shared` (Zod).

## Env

Copy each `.env.example` to `.env.local` and fill in:

- `apps/api/.env.example` — `PORT` (default 3001), `CORS_ORIGIN`, `DB_PATH`
  (default erp-fish.db), `DEMO_AGENT` (`true` serves canned order IDs for
  no-keys UI verification; `false` returns 503 until the live TinyFish
  adapter lands), `ERP_BASE_URL` + `TUNNEL_PROFILE_ID` (keyed phase),
  `OPENAI_*` (optional default model for chat and PDF/text parsing;
  users can supply their own connection in Settings).
- `apps/web/.env.example` — `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_ERP_HOST`
  + `NEXT_PUBLIC_PROFILE_ID` (defaults target the local demo).

API validates env at boot and crashes naming the missing var. Web validates
via `@t3-oss/env-nextjs`.

## Run

```bash
bun install
bun run --filter 'api' dev     # http://localhost:3001/api/hello
bun run --filter 'web' dev     # http://localhost:3000 (shows API hello)
```

With `DEMO_AGENT=true`: parse an invoice at `/parse`, start the autopilot
job, watch `/jobs/:id` (SSE replay + polling), answer questions inline,
inspect learned memory at `/memory`. The demo agent always returns the
canned IDs, and asks its one question only when the instruction contains
`doubt` (case-sensitive) — the real agent reads the goal instead.

## Check

```bash
bun run typecheck   # tsc --noEmit per workspace (active gate)
bun test            # seam tests A/B/C (api)
bun run check       # TypeScript and ESLint across the monorepo
```

## Bring your own model

Settings → AI model accepts a public HTTPS OpenAI-compatible completion URL
(or base URL), model ID, and API key. The model must support tool calls and
JSON output. Each account's saved connection is used for its next chat,
questionnaire continuation, and invoice parsing request. Server `OPENAI_*`
values remain optional defaults until a personal connection is saved.

Saved keys are encrypted with AES-GCM using a domain-separated key derived
from the server's `JWT_SECRET`; they are never returned to the browser.
Preserve that server secret across restarts. Rotating it requires users to
sign in again and re-enter saved model keys. Changing providers requires
entering a key for the new provider. Local/private-network endpoints and
redirects are rejected; connections use checked public IP addresses with TLS
verification for the configured hostname.

## Desktop languages and dictation

The desktop topbar language selector supports English, Hindi, and Tamil on
both the landing page and dashboard. One choice controls interface text,
voice input, and responses. Existing display preferences carry over. Interface
translations use next-intl dictionaries; conversation, questionnaire, and
memory prose use the desktop browser's native Translator API. Select a
language and wait for preparation to finish before sending. On a fresh page
load, available language packs reconnect automatically. If the browser requires
a click to initialize them, use **Retry translation** or **Show translation**
below the response; there is no need to return to Settings.
Browsers without the Translator API can continue in English. There is no
cloud translation fallback. Screens narrower than 768 px hide language and
voice controls and use the English interface.

Add `GROQ_API_KEY` to `apps/api/.env.local` and restart the API to enable
`whisper-large-v3` dictation. The green microphone beside Send records up to
two minutes (10 MB maximum). Stopping inserts the native transcript directly
into the main message box, after any existing draft. Edit it there and press
Send when ready. Microphone access needs HTTPS or localhost.

Chat messages and memory remain canonical English. Native user text is
stored separately for display and excluded from LLM messages. Links, code,
numbers, identifiers, and known ERP field labels are protected from machine
translation. Put exact ERP names in backticks when typing them; the agent is
also instructed to format exact ERP names and values as code. Protected
values never enter the translation model. Memory edits in
Hindi or Tamil require an English preview before saving.

React Doctor currently reports no errors. Its remaining warnings include
the existing UI scaffold and two reviewed cases: cancelling a language
download explicitly clears its busy state, and transcription does not mutate
cached server resources that require invalidation. No lint rules were relaxed.
