# erp-fish

Bun monorepo: `apps/web` (Next.js) + `apps/api` (Hono) + `packages/shared` (Zod).

## Self-host with Docker (Windows)

Install Docker Desktop with its WSL 2 Linux-container engine and start it.
From a clone of this repository, run in PowerShell:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/setup-local.ps1
docker compose --env-file .env.docker up --build -d
```

Open **http://localhost:3002**, create an account, then open Settings:

1. Save an OpenAI-compatible completion URL, model ID, and API key. The model
   needs tool calling and JSON output. Server `OPENAI_*` values in `.env.docker`
   can supply defaults instead.
2. Save the ERP URL and enable **Use local browser**. Without a TinyFish key,
   local mode is selected automatically.
3. Save the ERP username and password under **Local ERP login**.
4. Attach a PDF/text document, describe the task, select Agent mode, and choose
   **Save draft** or **Save and submit** before starting. **View browser** opens
   its live, read-only view. **Stop browser** stops the run; inspect the ERP
   before starting another request if the result is uncertain.

Optional dictation uses `GROQ_API_KEY` in `.env.docker` (`whisper-large-v3`).
Restart the API after changing runtime keys:

```powershell
docker compose --env-file .env.docker up -d
docker compose --env-file .env.docker logs --tail=100 api
```

The first build downloads Chromium and dependencies. No host Bun or Chromium
installation is needed. The web and API ports bind only to loopback. Stop any
development servers using ports 3001/3002 first, or change all four related
values (`API_PORT`, `WEB_PORT`, `API_PUBLIC_URL`, `WEB_ORIGIN`) in `.env.docker`.
Rebuild the web image when changing `API_PUBLIC_URL`, which Next.js embeds at
build time. Inside containers, `localhost` is the container: use
`host.docker.internal` to reach an ERP or model running on the Windows host.
Local deployment mode accepts private HTTP ERP and model URLs.

SQLite, encrypted credentials, and per-chat browser profiles live in the
`erp-data` named volume. Preserve it together with `.env.docker`; losing
`JWT_SECRET` invalidates sessions and saved model keys, and losing
`ERP_CREDENTIALS_KEY` makes saved ERP logins unreadable. Browser profiles contain
session cookies, so protect the volume as account data. `docker compose down`
keeps it; adding `-v` deletes it. The setup script never replaces existing keys.

### Local and production modes

`ERP_FISH_MODE` is the API's deployment policy; `NODE_ENV` keeps its normal
development/test/production meaning. Both Docker services use
`NODE_ENV=production`.

| Deployment | Browser behavior | Login storage |
| --- | --- | --- |
| `ERP_FISH_MODE=local` | Per-account local toggle; Chromium fallback if TinyFish key is absent | Local AES-GCM vault for Chromium; TinyFish Vault for remote runs |
| `ERP_FISH_MODE=production` | TinyFish only; local UI hidden and local API operations rejected | TinyFish Vault |

Production requires `TINYFISH_API_KEY` and an explicit account/ERP credential
assignment in `TINYFISH_VAULT_BINDINGS` for remote tasks. Missing remote
configuration returns an unavailable status; it never falls back to Chromium.
See `apps/api/.env.example` for the binding format. An HTTPS reverse proxy and
matching public API/CORS configuration are required for a public deployment.

Chromium and browser control run locally. Page observations still go to the
selected model provider, and optional voice input goes to Groq. Use a local
model endpoint and typed input if those calls must also stay on the machine.
The local agent uses observed DOM elements, not ERP-specific selectors or
hardcoded form paths. It supports same-origin HTML forms, including same-origin
frames. Cross-origin SSO, CAPTCHA, canvas-only controls, and manual MFA are not
supported in this first release; blockers return a question or an uncertain
run for review. The viewer does not let a user take over the browser.

Each run stores its provider, result, and attempts; each chat keeps its browser
profile, history, questions, and memories. Stopping/restarting the service does
not blindly retry writes. Draft requests prohibit finalizing controls, and every
write is instructed to search and verify duplicates first. Unknown browser
action failures stop the run for review rather than retrying a possible write.

## Development without Docker

Copy the app `.env.example` files to `.env.local`. The API requires `JWT_SECRET`.
For local browser work, also set `ERP_FISH_MODE=local`, a stable
`ERP_CREDENTIALS_KEY` (base64, 32 random bytes), and install Chromium:

```bash
bun install
cd apps/api
bunx playwright install chromium
cd ../..
bun run --filter 'api' dev     # http://localhost:3001
bun run --filter 'web' dev     # http://localhost:3000
```

Set `CORS_ORIGIN` to the web origin and `NEXT_PUBLIC_API_URL` to the API origin.
`LOCAL_BROWSER_HEADLESS=true` is useful for API-only checks. Without Docker,
headful Chromium opens on the development machine. Environment values are
validated at boot. The current chat-agent API always executes through the
chosen browser provider; `DEMO_AGENT` applies only to legacy fixtures.

## Check

```bash
bun run typecheck   # tsc --noEmit per workspace (active gate)
bun test            # seam tests A/B/C (api)
bun run check       # TypeScript and ESLint across the monorepo
```

### Local browser blocker regression

With the local Docker API running, run the manual agent loop from the repository
root. It uses an isolated account and a mock ERP on port 3022; it never modifies
your connected ERP. Supply `OPENAI_BASE_URL`, `OPENAI_MODEL`, and `OPENAI_API_KEY`
through `apps/api/.env.local` for the test account's model connection.

```powershell
$env:TEST_API_URL = "http://localhost:3016"
$env:TEST_API_CONTAINER = "erp-fish-local-check-api-1"
bun --env-file=apps/api/.env.local apps/api/scripts/local-browser-blocker-loop.ts
```

Set those two values to your API port and container name (`docker compose ps`).
Docker must be accessible from the shell. The fixture invoice omits a required
warehouse and offers two actual choices plus an unrelated form. The harness
requires a questionnaire within 16 browser actions, no writes or unrelated-form
visits before the answer, then one saved draft and a replay returning its existing
ID. A timeout stops the test's browser attempt. Browser actions are counted from
the container's sanitized job/run logs, including repeated reads and clicks.

## Bring your own model

Settings → AI model accepts an OpenAI-compatible completion URL
(or base URL), model ID, and API key. The model must support tool calls and
JSON output. Each account's saved connection is used for its next chat,
questionnaire continuation, and invoice parsing request. Server `OPENAI_*`
values remain optional defaults until a personal connection is saved.

Saved keys are encrypted with AES-GCM using a domain-separated key derived
from the server's `JWT_SECRET`; they are never returned to the browser.
Preserve that server secret across restarts. Rotating it requires users to
sign in again and re-enter saved model keys. Changing providers requires
entering a key for the new provider. Production rejects private-network/HTTP
model endpoints; local deployments permit them. Redirects are always rejected.
Connections use checked IP addresses and preserve hostname verification for TLS.

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
