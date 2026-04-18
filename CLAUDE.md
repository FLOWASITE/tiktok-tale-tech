# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**Flowa** — B2B Content Orchestration Platform cho thị trường Việt Nam (despite the repo name `tiktok-tale-tech`). Generates AI content (scripts, carousels, multi-channel posts, ad copy) with industry compliance and brand voice consistency, then publishes to 8+ social platforms.

The full technical documentation lives in `docs/` (README, ARCHITECTURE, CORE-FEATURES, INDUSTRY-PARK, KNOWLEDGE-GRAPH, EDGE-FUNCTIONS, DATABASE-SCHEMA). Read these before making non-trivial changes.

## Commands

```bash
npm run dev              # Vite dev server on port 8080 (host "::")
npm run build            # Production build
npm run build:dev        # Development-mode build (keeps componentTagger)
npm run lint             # ESLint over the repo
npm run preview          # Preview production build

# Tests (no npm script defined — run vitest directly)
npx vitest               # Watch mode
npx vitest run           # Single pass
npx vitest run path/to/file.test.ts        # Single file
npx vitest run -t "test name pattern"      # Single test by name
npx vitest --coverage    # Coverage (v8 reporter)
```

Vitest picks up tests in both `src/**/*.{test,spec}.*` and `supabase/functions/**/*.{test,spec}.*`. Globals are enabled (no need to import `describe`/`it`/`expect`). Setup file: `vitest.setup.ts` (mocks `crypto.randomUUID`, resets mocks in `beforeEach`).

`bun.lockb` is also checked in — either npm or bun works.

## Architecture

### Subdomain-based routing
`src/App.tsx` selects between two route trees via `useDomainRouting`:

- `flowa.one` → marketing/landing (`src/landing/routes.tsx`)
- `app.flowa.one` → application (`src/app/routes.tsx`), wraps protected routes in `<ProtectedRoute>` + `<AppLayout>`; admin pages add `<AdminProtectedRoute>`
- `help.flowa.one` → help center

OAuth callback routes (Facebook/Instagram/LinkedIn/TikTok/X/Threads/Zalo/Google Business) live outside the protected tree.

### Multi-tenant context layering
Three React contexts compose state (in `src/contexts/`):

1. **AuthContext** — Supabase session, profile
2. **OrganizationContext** — current org, members, switching
3. **BrandContext** — brand templates scoped to the active org

Most data hooks (`useTopics`, `useCampaigns`, …) depend on org and/or brand IDs from these contexts. RLS policies enforce the same isolation server-side.

### Priority cascade for content generation
When generating content, rules apply in this fixed order — never invert it:

```
Industry Memory (immutable, per-jurisdiction)
   ↓
Brand Voice (customizable per brand_template)
   ↓
Channel Rules (per platform)
   ↓
System Defaults
```

Industry Memory lives in `industry_global_packs` + `industry_jurisdiction_profiles` and feeds the Knowledge Graph (`industry_knowledge_nodes`, pgvector 384-dim embeddings via `gte-small`). See `docs/INDUSTRY-PARK.md` and `docs/KNOWLEDGE-GRAPH.md`.

### Supabase backend (Lovable Cloud)
- **157 edge functions** in `supabase/functions/` (Deno). Naming groups: `generate-*`, `publish-<platform>`, `<platform>-oauth-callback`, `refresh-<platform>-token`, `test-<platform>-connection`, `topic-*`, `agent-*`, `*-regulation*`, `*-knowledge*`. Shared modules under `supabase/functions/_shared/` (e.g. `ai-provider.ts` for multi-provider routing across Lovable Gateway / OpenRouter / OpenAI, `agentic-loop.ts`, `streaming-handler.ts`, `compliance-precheck.ts`).
- **268 migrations** in `supabase/migrations/` — apply additive changes only; never edit a published migration.
- **Public functions** must be added to `supabase/config.toml` with `verify_jwt = false` (e.g. webhooks, payment callbacks, public generators). Edits to this file are deploy-relevant — don't change unrelated entries.
- Some functions have been **merged**; comments in `config.toml` document this (e.g. `regenerate-channel` merged into `generate-multichannel` with `action='regenerate'`). Check before re-creating a "missing" function.

### Frontend stack notes
- Vite + `@vitejs/plugin-react-swc`, path alias `@` → `src/`
- shadcn/ui (config in `components.json`, base color `slate`, CSS vars in `src/index.css`); component aliases: `@/components`, `@/components/ui`, `@/lib`, `@/lib/utils`, `@/hooks`
- TanStack Query for all server state — invalidate by `queryKey` after mutations
- i18next with `vi` (default + fallback), `en`, `th` in `src/i18n/locales/`; bootstrapped from `src/main.tsx`
- ESLint disables `@typescript-eslint/no-unused-vars` globally — don't rely on it to flag dead code

## Auto-generated files — do not edit by hand

- `src/integrations/supabase/client.ts`
- `src/integrations/supabase/types.ts` (DB types regenerated from schema)
- `.env` (managed by Lovable Cloud)
- `supabase/config.toml` is partially auto-managed; only add `verify_jwt` entries for new public functions

## Styling rule

Use semantic Tailwind tokens defined in `src/index.css` (`bg-primary`, `text-muted-foreground`, `border-border`, …). Don't use raw color utilities (`bg-blue-500`, `text-white`) — they bypass theming and dark mode.
