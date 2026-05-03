---
name: SEO Hub IA v2
description: 4-tab workflow Discover → Plan → Produce → Track thay 7 tabs cũ; Hero strip với KPI + stepper; legacy ?tab= redirect map trong AdminSeoHub.tsx
type: design
---

## Truy cập (v2.1 — mở cho mọi user)
- **Mọi user**: route `/seo` → 3 tab Discover / Plan / Track (data scoped theo `organization_id` qua RLS).
- **Admin app**: route `/admin/seo` → đủ 4 tab gồm **Produce** (quản lý `seo_landing_pages` public của flowa.one — RLS `app_role='admin'`).
- Component dùng chung: `src/pages/SeoHub.tsx` (prop `isAdmin`); `AdminSeoHub.tsx` chỉ là wrapper `<SeoHub isAdmin />`.
- Sidebar: mục SEO Hub xuất hiện trong nhóm Management (mọi user) + nhóm Admin (admin only).

## Cấu trúc mới (thay 7 tabs cũ)
- **Discover** — sub: research / import / enrich (gộp Enrichment Jobs vào đây)
- **Plan** — sub: pillars / keywords (gộp PillarsTab + KeywordExplorerTab)
- **Produce** — AdminSeoPages (landing pages)
- **Track** — sub: health (OverviewTab orphan/cannibal) / ranks (RankTrackerTab)

## Hero strip (`SeoHubHero.tsx`)
- 4 KPI cards: Keywords, Pillars, Pages, Sức khoẻ (orphan+cannibal)
- Workflow stepper 4 nút clickable dẫn tới tab tương ứng
- Empty state khi chưa có keyword → CTA mở Discover

## Legacy URL redirect (`AdminSeoHub.tsx` LEGACY_MAP)
| Old | New |
|---|---|
| `?tab=overview\|dashboard\|coverage` | `?tab=track&sub=health` |
| `?tab=explorer` | `?tab=plan&sub=keywords` |
| `?tab=pillars` | `?tab=plan&sub=pillars` |
| `?tab=research\|import` | `?tab=discover&sub=...` |
| `?tab=enrichment` | `?tab=discover&sub=enrich` (giữ `?jobId=`) |
| `?tab=ranks` | `?tab=track&sub=ranks` |
| `?tab=pages` | `?tab=produce` |

## Workspace components
- `src/components/admin/seo-hub/SeoHubHero.tsx`
- `src/components/admin/seo-hub/DiscoverWorkspace.tsx`
- `src/components/admin/seo-hub/PlanWorkspace.tsx`
- `src/components/admin/seo-hub/TrackWorkspace.tsx`

## Lưu ý
- Sub-components cũ (`PillarsTab`, `KeywordExplorerTab`, `OverviewTab`, `RankTrackerTab`, `EnrichmentJobsTab`, `KeywordResearchLabTab`, `KeywordImportTab`) giữ nguyên — chỉ tái sắp xếp container
- `DiscoverTab.tsx` cũ (sub-tabs research/import) đã bị `DiscoverWorkspace.tsx` thay thế
- URL deep-link `?tab=enrichment&jobId=...` vẫn hoạt động qua redirect → `?tab=discover&sub=enrich&jobId=...`
