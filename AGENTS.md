<!-- BEGIN:nextjs-agent-rules -->
# Next.js version rule

This project may use a newer Next.js version than an agent expects. Before
changing framework-specific code, read the relevant guide in
`node_modules/next/dist/docs/` and follow current deprecation notices.
<!-- END:nextjs-agent-rules -->

# FixFlow AI contributor guide

## Project

FixFlow AI is a public portfolio demo: an AI dispatcher and read-only CRM for a
fictional field-service company. Never add real customer data to the repository,
fixtures, screenshots, or logs. Mask demo phone numbers and addresses.

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

- `/demo/crm` is public and read-only; employee authentication is out of scope.
- Next.js may emit webhook events, but must not send Telegram messages or run
  cron jobs, timers, or delayed follow-ups.
- Make or n8n owns Telegram delivery, delays, and external automation.
- Do not introduce Supabase or Vercel.
- Neon PostgreSQL is implemented. The optional LLM layer may only classify,
  extract structured data, and phrase questions; deterministic server code
  validates fields and owns all writes.
- RAG uses demo Markdown/TXT documents, local deterministic 1536-dimensional
  embeddings, and pgvector retrieval in Neon. Claude may answer only from
  retrieved chunks. External automations are not implemented yet.
