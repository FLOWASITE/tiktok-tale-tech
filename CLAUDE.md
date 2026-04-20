# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# Flowa - AI Marketing Agent Platform

## 🎯 Mission
AI Marketing Agent platform cho teams tại Vietnam/SEA.
Vertical-first: Aesthetic surgery & high-tech beauty industry.

## 🤝 Parallel workflow với Lovable.dev
Repo này được edit **song song bởi Claude Code và Lovable.dev**. Backend host trên **Lovable Cloud** (managed Supabase, project `rllyipiyuptkibqinotz`).
- **Coordination via git**: pull trước khi edit, commit/push thường xuyên để Lovable thấy được thay đổi
- **Deploy/migration ĐI QUA LOVABLE**: edge functions auto-deploy khi commit; migrations auto-apply. KHÔNG chạy `supabase functions deploy` hay `supabase db push` thủ công → tạo drift Lovable không track được
- **Supabase MCP nếu có cài → dùng `--read-only`**: chỉ query data/schema/RLS, không mutate
- **Auto-generated files** (`src/integrations/supabase/{client,types}.ts`, `.env`, một phần `supabase/config.toml`) do Lovable Cloud regenerate — KHÔNG sửa tay

## 📎 Nested CLAUDE.md (đọc khi vào từng folder)
- `supabase/functions/CLAUDE.md` → edge function runtime, auth pattern, skeleton
- `supabase/migrations/CLAUDE.md` → migration rules, RLS templates, Knowledge Graph/vector conventions
- `src/components/CLAUDE.md` → component naming, imports, styling, shadcn/ui usage

## 🏗️ Architecture
- **Frontend**: React 18 + TypeScript + Vite (SWC) + shadcn/ui + TanStack Query + React Router v6
- **Backend**: Supabase + Lovable Cloud (managed)
- **AI**: Lovable Gateway (GPT-5, Gemini 2.5/3) + Supabase embeddings (`gte-small`, 384-dim)
- **Routing**: flowa.one (landing) / app.flowa.one (app) / help.flowa.one
  - Subdomain detection via `useDomainRouting` in `src/App.tsx` → switches between `src/landing/routes.tsx` và `src/app/routes.tsx`
  - App routes wrap `<ProtectedRoute>` + `<AppLayout>`; admin routes thêm `<AdminProtectedRoute>`; landing pages cũng accessible từ app domain (lazy) cho preview/dev
- **State**: TanStack Query (server) + 4 contexts: Auth → Organization → Brand → CarouselGeneration (global tracker)
- **Path alias**: `@/` → `src/` (áp dụng cả Vite + Vitest + tsconfig)

## 📁 Project Structure
- `/supabase/functions/` → **162 edge functions** (Deno)
  - `generate-*` (21) → content generation (script, carousel, multichannel, ad-copy, hooks, core-content, brand-*, storyboard, music, video, embeddings…)
  - `publish-*` (10) → platform publishing (facebook, instagram, linkedin, tiktok, twitter, threads, zalo, google-business, website, blog)
  - `*-oauth-callback` (8) + `refresh-*-token` (8) + `test-*-connection|credentials` (19) → social OAuth flows
  - `agent-*` (5) → pipeline, approve, creator-v2, quality, orchestrator-analytics
  - `telegram-*` (6) → bot, webapp, webhook, daily digest, binding
  - `geo-*` (5) → GEO (Generative Engine Optimization) scoring, prompts, schema, competitors
  - `payment/payos/vnpay/*` → checkout + webhook flows
  - `_shared/` → ~80 shared modules (`ai-provider.ts`, `streaming-handler.ts`, `compliance-precheck.ts`, `agents/`, `pipeline/`, `supervisor/`, `graph/`, `cache/`, `middleware/`, `context-builders/`, `errors/`, `types/`)
- `/supabase/migrations/` → **281 migrations** (append-only)
- `/src/pages/` → **64 app route pages** (Core, Brand, Campaign, Carousel, Script, MultiChannel, Agent, Chat, 20 Admin, Auth callbacks, Telegram)
- `/src/landing/` → landing site (`pages/` = 13 public pages, `components/`, `routes.tsx`)
- `/src/components/` → **147 root components** + domain subfolders (`ui/`, `admin/`, `brand/`, `topic/`, `carousel/`, `script/`, `multichannel/`, `agents/`, `compliance/`, `chat/`, `dashboard/`, `geo/`, `help/`, `adcopy/`, `calendar/`, `campaign/`, `core-content/`, `social/`, `blog/`, `image/`, `onboarding/`, `preview/`, `viewer/`, `icons/`, `landing/`)
- `/src/hooks/` → **210 hooks** (server data fetching + UI + `hooks/ai/` for AI helpers)
- `/src/contexts/` → `AuthContext`, `OrganizationContext`, `BrandContext`, `CarouselGenerationContext`
- `/src/integrations/supabase/` → auto-generated client + types (DO NOT EDIT)
- `/src/i18n/locales/` → `vi.json` (default), `en.json`, `th.json`
- `/src/config/`, `/src/lib/`, `/src/utils/`, `/src/types/` → shared helpers
- `/docs/` → `ARCHITECTURE.md`, `CORE-FEATURES.md`, `INDUSTRY-PARK.md`, `KNOWLEDGE-GRAPH.md`, `EDGE-FUNCTIONS.md`, `DATABASE-SCHEMA.md`

## 🗄️ Core Database Tables
- **Industry Memory system** (HIGHEST PRIORITY, immutable from user):
  - `industry_global_packs`, `industry_pack_translations`, `industry_jurisdiction_profiles`
  - `industry_templates`, `industry_personas`, `industry_glossary`, `industry_memory_versions`
- `brand_templates` → giọng điệu thương hiệu (per organization) + variants
- `industry_knowledge_nodes` (pgvector 384-dim, IVF index) + `industry_knowledge_edges` → Knowledge Graph
- `topics`, `scripts`, `carousels`, `multi_channel_contents`, `campaigns`, `core_contents`, `ad_copies`
- `social_connections` (encrypted tokens), `publishing_logs`
- `agent_pipelines`, `agent_execution_logs`, `approval_assignments`
- `regulation_sources`, `regulation_crawl_history`, `regulation_propagation_log`
- **RLS**: isolation theo `organization_id` (org members CRUD); profiles/social_connections owner-only; admin tables admin-only

## 🎯 Core Features (theo priority cascade)
```
Industry Memory (immutable)  →  Brand Voice  →  Channel Rules  →  System Defaults
```
1. **Industry Memory** - priority cao nhất, block mọi thứ; rules per jurisdiction (forbidden terms, claim restrictions)
2. **Brand Voice** - clone từ samples + variants, persisted in `brand_templates`
3. **Content Generation** - script video (60-180s), carousel (5-10 slides), multi-channel, ad copy, core content, hooks, storyboard
4. **Knowledge Graph** - vector search (IVF index 384-dim), semantic similarity, regulation propagation
5. **Agent System** - AI agents pipeline với approval flow (`agent-pipeline`, `agent-orchestrator-analytics`, `agent-approve`, `agent-quality`)
6. **Multi-platform Publishing** - FB, IG, LinkedIn, TikTok, X, Threads, Zalo, GBP, Website, Blog
7. **Compliance Automation** - `compliance-precheck` shared module + auto regulation crawling
8. **GEO (Generative Engine Optimization)** - brand scan, competitor tracking, content scoring, schema/prompts generation
9. **Telegram integration** - mini-app (`/telegram-app`), bot, daily digest, admin workspace binding

## ⚙️ Development Rules
- **Luôn check RLS** khi viết query mới (isolation theo `organization_id`)
- **Edge functions**: Deno syntax, không phải Node; public endpoints phải khai báo `verify_jwt = false` trong `supabase/config.toml` (cùng commit với code)
- **Migrations**: không bao giờ edit migration đã deploy, chỉ tạo mới (additive). Timestamp ordering matter.
- **Industry Memory**: read-only từ user, chỉ admin update
- **Naming**: edge functions theo pattern `action-resource` (generate-script, publish-tiktok)
- **Merged functions**: kiểm tra `config.toml` comments trước khi tạo lại function "thiếu" (vd `regenerate-channel` đã merged vào `generate-multichannel` với `action='regenerate'`)
- **Styling**: dùng semantic tokens (`bg-primary`, `text-muted-foreground`, `border-border`); KHÔNG dùng raw colors (`bg-blue-500`, `text-white`) — bypass theme + dark mode
- **Data fetching**: KHÔNG gọi supabase trực tiếp trong component; luôn qua hook trong `@/hooks/*` (TanStack Query)
- **Auth pattern**: protected routes wrap trong `<ProtectedRoute>` + `<AppLayout>`; admin routes thêm `<AdminProtectedRoute>`; landing pages dùng `<Suspense>` fallback
- **Imports**: luôn dùng alias `@/` (components → ui → hooks → lib → utils → types)

## 🚫 Không được làm
- Không tự ý chạy migration production
- Không edit file trong `/supabase/functions/_shared/` mà không hỏi (ảnh hưởng tất cả 162 functions)
- Không commit API keys, secrets
- Không thay đổi schema `industry_*` tables mà không confirm
- Không sửa file auto-generated: `src/integrations/supabase/client.ts`, `src/integrations/supabase/types.ts`, `.env`
- Không đảo ngược priority cascade (Industry > Brand > Channel > Defaults)
- Không fetch supabase trực tiếp trong component (phải qua hook)
- Không đổi embedding dim (fixed 384 / `gte-small`)

## 📚 Key Docs (đọc khi cần context sâu)
- `docs/ARCHITECTURE.md` → Industry Park v2.1 deep dive
- `docs/CORE-FEATURES.md` → feature specs
- `docs/INDUSTRY-PARK.md` → industry memory logic
- `docs/KNOWLEDGE-GRAPH.md` → vector search
- `docs/EDGE-FUNCTIONS.md` → edge function catalog
- `docs/DATABASE-SCHEMA.md` → full schema

## 🔧 Common Commands
```bash
# Local dev
npm run dev                          # Vite dev server on port 8080 (host ::)
npm run build                        # Production build
npm run build:dev                    # Dev-mode build (giữ componentTagger for Lovable)
npm run lint                         # ESLint (flat config)
npm run preview                      # Preview production build

# Tests (no npm script — run vitest directly)
npx vitest                           # Watch mode
npx vitest run                       # Single pass
npx vitest run path/to/file.test.ts  # Single file
npx vitest run -t "test name"        # Single test by name
npx vitest --coverage                # v8 coverage

# Supabase (edge functions auto-deploy qua Lovable Cloud khi push — chỉ dùng khi thật cần)
supabase functions deploy <name>     # manual deploy
supabase db push                     # apply migrations
```

Tests cover both `src/**/*.{test,spec}.*` và `supabase/functions/**/*.{test,spec}.*`. Vitest globals enabled (no need to import `describe`/`it`/`expect`). Node env. Setup: `vitest.setup.ts`.

## 👤 About the developer
- Solo founder, thinking in Vietnamese + English
- Prefer structured, data-driven responses
- Don't over-explain basics, get to the point
