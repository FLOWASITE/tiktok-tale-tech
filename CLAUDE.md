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

## 🏗️ Architecture
- **Frontend**: React 18 + TypeScript + Vite + shadcn/ui + TanStack Query
- **Backend**: Supabase + Lovable Cloud
- **AI**: Lovable Gateway (GPT-5, Gemini 2.5/3) + Supabase embeddings (`gte-small`, 384-dim)
- **Routing**: flowa.one (landing) / app.flowa.one (app) / help.flowa.one
  - Subdomain detection via `useDomainRouting` in `src/App.tsx` → switches between `src/landing/routes.tsx` và `src/app/routes.tsx`
- **State**: TanStack Query (server) + 3 contexts layered: Auth → Organization → Brand

## 📁 Project Structure
- `/supabase/functions/` → 157 edge functions (Deno)
  - `generate-*` (22) → content generation (script, carousel, multichannel, ad-copy, hooks, …)
  - `publish-*` (10) → platform publishing (facebook, instagram, linkedin, tiktok, twitter, threads, zalo, google-business, website, blog)
  - `*-oauth-callback` + `refresh-*-token` + `test-*-connection` (21+) → OAuth flows
  - `_shared/` → shared modules (`ai-provider.ts`, `agentic-loop.ts`, `streaming-handler.ts`, `compliance-precheck.ts`)
- `/supabase/migrations/` → 268 migrations
- `/src/pages/` → 58 route pages (Core, Brand, Campaign, 18 Admin, Auth callbacks, Landing)
- `/src/components/` → 172 UI components (`ui/`, `admin/`, `brand/`, `topic/`, `carousel/`, `scripts/`, `agents/`, `compliance/`)
- `/src/hooks/` → 197 hooks (data fetching + AI in `hooks/ai/`)
- `/src/contexts/` → AuthContext, OrganizationContext, BrandContext
- `/src/integrations/supabase/` → auto-generated client + types (DO NOT EDIT)
- `/src/i18n/locales/` → vi (default), en, th
- `/docs/` → documentation chính

## 🗄️ Core Database Tables
- **Industry Memory system** (HIGHEST PRIORITY, immutable from user):
  - `industry_global_packs`, `industry_pack_translations`, `industry_jurisdiction_profiles`
  - `industry_templates`, `industry_personas`, `industry_glossary`, `industry_memory_versions`
- `brand_templates` → giọng điệu thương hiệu (per organization)
- `industry_knowledge_nodes` (pgvector 384-dim) + `industry_knowledge_edges` → Knowledge Graph
- `topics`, `scripts`, `carousels`, `multi_channel_contents`, `campaigns`, `core_contents`
- `social_connections` (encrypted tokens), `publishing_logs`
- `agent_pipelines`, `agent_execution_logs`
- `regulation_sources`, `regulation_crawl_history`, `regulation_propagation_log`
- **RLS**: isolation theo `organization_id` (org members CRUD; profiles/social_connections owner-only; admin tables admin-only)

## 🎯 Core Features (theo priority cascade)
```
Industry Memory (immutable)  →  Brand Voice  →  Channel Rules  →  System Defaults
```
1. **Industry Memory** - priority cao nhất, block mọi thứ; rules per jurisdiction (forbidden terms, claim restrictions)
2. **Brand Voice** - clone từ samples + variants, persisted in `brand_templates`
3. **Content Generation** - script video (60-180s), carousel (5-10 slides), multi-channel, ad copy
4. **Knowledge Graph** - vector search (IVF index), semantic similarity, regulation propagation
5. **Agent System** - AI agents pipeline với approval flow (`agent-pipeline`, `agent-orchestrator-analytics`, `agent-approve`)
6. **Multi-platform Publishing** - FB, IG, LinkedIn, TikTok, X, Threads, Zalo, GBP, Website, Blog
7. **Compliance Automation** - `compliance-precheck` shared module + auto regulation crawling

## ⚙️ Development Rules
- **Luôn check RLS** khi viết query mới (isolation theo `organization_id`)
- **Edge functions**: Deno syntax, không phải Node; public endpoints phải khai báo `verify_jwt = false` trong `supabase/config.toml`
- **Migrations**: không bao giờ edit migration đã deploy, chỉ tạo mới (additive)
- **Industry Memory**: read-only từ user, chỉ admin update
- **Naming**: edge functions theo pattern `action-resource` (generate-script, publish-tiktok)
- **Merged functions**: kiểm tra `config.toml` comments trước khi tạo lại function "thiếu" (vd: `regenerate-channel` đã merged vào `generate-multichannel` với `action='regenerate'`)
- **Styling**: dùng semantic tokens (`bg-primary`, `text-muted-foreground`); KHÔNG dùng raw colors (`bg-blue-500`)
- **Auth pattern**: protected routes wrap trong `<ProtectedRoute>` + `<AppLayout>`; admin routes thêm `<AdminProtectedRoute>`

## 🚫 Không được làm
- Không tự ý chạy migration production
- Không edit file trong `/supabase/functions/_shared/` mà không hỏi (ảnh hưởng tất cả 157 functions)
- Không commit API keys, secrets
- Không thay đổi schema `industry_*` tables mà không confirm
- Không sửa file auto-generated: `src/integrations/supabase/client.ts`, `src/integrations/supabase/types.ts`, `.env`
- Không đảo ngược priority cascade (Industry > Brand > Channel > Defaults)

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
npm run dev                          # Vite dev server on port 8080
npm run build                        # Production build
npm run build:dev                    # Dev-mode build (giữ componentTagger)
npm run lint                         # ESLint
npm run preview                      # Preview production build

# Tests (no npm script — run vitest directly)
npx vitest                           # Watch mode
npx vitest run                       # Single pass
npx vitest run path/to/file.test.ts  # Single file
npx vitest run -t "test name"        # Single test by name
npx vitest --coverage                # v8 coverage

# Supabase (edge functions auto-deploy qua Lovable Cloud khi push)
supabase functions deploy <name>     # manual deploy nếu cần
supabase db push                     # apply migrations
```

Tests cover both `src/**/*.{test,spec}.*` và `supabase/functions/**/*.{test,spec}.*`. Vitest globals enabled (no need to import `describe`/`it`/`expect`).

## 👤 About the developer
- Solo founder, thinking in Vietnamese + English
- Prefer structured, data-driven responses
- Don't over-explain basics, get to the point
