<!-- BEGIN:nextjs-agent-rules -->
# Next.js version rule

This project may use a newer Next.js version than an agent expects. Before
changing framework-specific code, read the relevant guide in
`node_modules/next/dist/docs/` and follow current deprecation notices.
<!-- END:nextjs-agent-rules -->

# FixFlow AI contributor guide

## Project

FixFlow AI is an AI dispatcher and operations platform for field-service
companies, shown through a public test workspace with fictional data. Never
add real customer data to the repository, fixtures, screenshots, or logs.
Mask demo phone numbers and addresses.

## Commands

- `npm run dev` — start the local development server.
- `npm run lint` — run ESLint.
- `npm run typecheck` — check TypeScript without emitting files.
- `npm test` — run Vitest once.
- `npm run build` — create a production build.
- `npm run check` — run every required quality check.

## Engineering conventions

- Use the Next.js App Router, TypeScript, the `src` directory, and `@/*` imports.
- Prefer Server Components. Add Client Components only for real interactivity.
- Use Tailwind CSS and components generated through shadcn/ui.
- Keep domain logic outside React components and cover it with Vitest.
- Update `docs/progress.md` after meaningful work and record durable choices in
  `docs/decisions.md`.

## Architecture boundaries

- `/workspace/leads` is public and read-only; employee authentication is out
  of scope.
- Next.js may emit webhook events, but must not send Telegram messages or run
  cron jobs, timers, or delayed follow-ups.
- Make owns Telegram delivery, delays, and external automation. n8n is not
  used.
- Do not introduce Supabase. The app has run on Vercel (not Netlify) since
  the D-024 migration — a git push to `main` auto-deploys there.
- Neon PostgreSQL is implemented. The chat is a tool-calling agent
  (`src/server/chat/agent.ts`, modeled on a working sibling project rather
  than a hand-rolled state machine, D-032): Claude drives the conversation
  itself and calls `check_availability`/`create_lead`/`book_slot` when it
  has what it needs — it never writes to the database directly. Every tool
  handler (`src/server/chat/tools.ts`) independently validates its
  arguments (phone format, service-name resolution against the real
  catalog, atomic slot booking) before writing, so "LLM proposes,
  deterministic server code decides and owns all writes" still holds; there
  is just no intermediate FSM translating between a classification and
  hand-rolled steps anymore.
- Knowledge (services, prices, FAQ, warranty, service area) is baked
  directly into the chat's system prompt (`src/server/chat/system-prompt.ts`)
  from the `documents` table — there is no vector retrieval step. The
  `document_chunks`/pgvector schema still exists but is unused; it was not
  migrated away when RAG retrieval was removed (D-032). External
  automations beyond Make are not implemented yet.
