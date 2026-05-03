# Gọn SEO Hub — Sprint 3

## Hiện trạng
8 tabs: Dashboard | Keywords | Pillars | Coverage | Research | Ranks | Import | Pages.
Vấn đề:
- **Dashboard ↔ Coverage trùng vai trò**: Dashboard show "Top 10 unassigned" + funnel; Coverage show Orphan/Gap/Cannibal. Cùng dùng để "biết phải làm gì tiếp".
- **Research ↔ Import trùng vai trò**: cả 2 đều là "thu nạp keyword mới vào pool" — chỉ khác nguồn (AI lab vs CSV).
- **8 tabs trên viewport 707px** vẫn chật, đã giảm từ 9 nhưng chưa đủ thoáng.
- **Query duplicate**: `seo_keywords` + `seo_clusters` được fetch riêng ở Dashboard, Explorer, Coverage, Pillars — 4 cache keys khác nhau cho cùng dataset.

## Đề xuất gom xuống 6 tabs

```text
Overview  |  Keywords  |  Pillars  |  Discover  |  Ranks  |  Pages
```

| Tab mới | Gồm gì |
|---|---|
| **Overview** | KPIs (Dashboard cũ) + sub-tabs Gap/Cannibalization/Orphan/Top-priority (Coverage cũ). Một nơi để "biết tuần này làm gì" |
| **Keywords** | KeywordExplorerTab (giữ nguyên) |
| **Pillars** | PillarsTab + PillarDetailView (giữ nguyên) |
| **Discover** | Sub-tabs: Research Lab (AI suggest) / CSV Import |
| **Ranks** | RankTrackerTab (giữ nguyên) |
| **Pages** | AdminSeoPages (giữ nguyên) |

## Refactor đồng thời

1. **Tạo `src/hooks/useSeoKeywords.ts`** — single query `seo_keywords` + filter helpers. Dashboard/Explorer/Coverage cùng dùng → giảm 3 round-trip xuống 1 cache (TanStack Query staleTime 30s).
2. **Tạo `src/hooks/useSeoPillars.ts`** — tương tự cho `seo_clusters`.
3. **Xoá `KeywordDashboardTab.tsx`** sau khi merge KPI + funnel + top-unassigned vào `OverviewTab.tsx` mới.
4. **Wrapper `DiscoverTab.tsx`** — chỉ là 2 sub-tabs render `KeywordResearchLabTab` + `KeywordImportTab` (không xoá 2 file gốc, chỉ host).

## Files

**Tạo**
- `src/hooks/useSeoKeywords.ts`
- `src/hooks/useSeoPillars.ts`
- `src/components/admin/seo-keywords/OverviewTab.tsx` (merge Dashboard + Coverage)
- `src/components/admin/seo-keywords/DiscoverTab.tsx` (host Research + Import)

**Sửa**
- `src/pages/AdminSeoHub.tsx` — TabsList từ `grid-cols-8` → `grid-cols-6`, route lại
- `KeywordExplorerTab.tsx`, `PillarsTab.tsx` — chuyển sang dùng shared hooks (giữ behavior)

**Xoá**
- `src/components/admin/seo-keywords/KeywordDashboardTab.tsx`
- `src/components/admin/seo-keywords/CoverageTab.tsx` (logic chuyển vào OverviewTab)

## Backward compat
URL cũ `?tab=dashboard` / `?tab=coverage` / `?tab=research` / `?tab=import` → redirect sang `?tab=overview` hoặc `?tab=discover` trong `useEffect` của `AdminSeoHub`. Không break bookmark.

## Không trong scope
- Không đổi DB schema
- Không đổi RLS
- Không đổi edge functions
