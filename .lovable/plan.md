# Chuẩn hoá công thức Engagement Rate theo Platform

## Vấn đề hiện tại

Trong `src/hooks/reports/useEngagementReport.ts` (dòng 72–74), engagement rate được tính bằng **một công thức duy nhất** cho mọi platform:

```ts
engagementRate = (totalLikes + totalComments + totalShares) / totalImpressions × 100
```

Sai về phương pháp luận khi so sánh giữa các platform:

| Platform | Vấn đề với công thức hiện tại |
|---|---|
| **Facebook/Instagram** | Meta Business chuẩn dùng **Reach**, không phải Impressions. Bỏ qua **Saves** (chỉ số chính cho IG). |
| **TikTok** | Phải dùng **Video Views** (denominator chính của TikTok Analytics). Dùng impressions = sai số rất lớn. |
| **X (Twitter)** | Bỏ **Bookmarks** — đây là engagement cốt lõi sau khi X mở `non_public_metrics.impressions`. |
| **LinkedIn** | Đúng denominator (impressions) nhưng numerator nên gọi "Reactions" thay vì "Likes". |
| **Aggregate** | Cộng dồn Likes/Comments/Shares + Impressions giữa các platform → bias theo platform có impressions cao (X, LinkedIn) so với platform tracking reach (FB/IG). |

Hậu quả: KPI "Engagement rate" tổng workspace không có ý nghĩa, không thể so sánh hiệu quả giữa kênh.

## Mục tiêu

1. **Per-post ER**: dùng đúng công thức theo platform.
2. **Aggregate ER**: dùng **weighted average** đúng toán học = `Σengagements / Σdenominator × 100` (không phải arithmetic mean của ER per-post — gây bias theo post nhỏ).
3. **Hiển thị minh bạch**: tooltip/info giải thích công thức từng platform để team biết đang đo gì.
4. **Per-platform breakdown**: thêm cột ER vào bảng `byPlatform` để so sánh.

## Công thức chuẩn theo platform

| Platform | Engagements (numerator) | Denominator | Nguồn chuẩn |
|---|---|---|---|
| **Facebook** | Likes + Comments + Shares + Saves | Reach (fallback Impressions) | Meta Business |
| **Instagram** | Likes + Comments + Shares + Saves | Reach (fallback Impressions) | Meta Business |
| **TikTok** | Likes + Comments + Shares | Video Views (fallback Reach) | TikTok Analytics |
| **X / Twitter** | Likes + Replies + Retweets + Bookmarks (`saves` field) | Impressions (fallback Reach) | X Analytics |
| **LinkedIn** | Reactions + Comments + Shares | Impressions (fallback Reach) | LinkedIn |
| **Threads** | Likes + Replies + Reposts | Reach (fallback Impressions) | — |
| **Unknown** | Likes + Comments + Shares + Saves | Impressions (fallback Reach) | Fallback |

Lưu ý field `saves` trong `social_post_metrics` đã được sync chính xác cho IG (saves) và X (bookmarks) qua `sync-social-engagement` — không cần migration.

## Thay đổi kỹ thuật

### 1. **NEW** `src/lib/reports/engagementFormulas.ts`
Module thuần (no React, no Supabase) chứa:
- `type Platform`, `interface PostMetrics`, `interface ERFormula`
- `computeERParts(platform, metrics)` — trả về `{ engagements, denominator, denominatorType, formula }` theo bảng trên với fallback.
- `postEngagementRate(platform, metrics)` — ER cho 1 post, làm tròn 2 chữ số.
- `weightedEngagementRate(posts[])` — aggregate đúng toán học `ΣE / ΣD × 100`.
- `normalizePlatform(p)` — alias `fb→facebook`, `ig→instagram`, `x→twitter`, …
- `PLATFORM_FORMULA_DOCS: Record<platform, string>` — text hiển thị tooltip.

### 2. **EDIT** `src/hooks/reports/useEngagementReport.ts`
- Mở rộng `EngagementReportData`:
  ```ts
  engagementRate: number;            // weighted, all platforms
  engagementRateBasis: 'mixed';      // hint cho UI
  byPlatform: { ..., engagementRate: number; erFormula: string }[];
  ```
- Thay logic dòng 72–74 bằng `weightedEngagementRate(latest.map(...))`.
- Trong vòng lặp `byPlatform`, cộng thêm `engagements` & `denominator` per-platform rồi tính ER per-platform = `eng / denom × 100`. Gắn `erFormula` từ `PLATFORM_FORMULA_DOCS`.
- Top posts: thêm field `engagementRate` per-post dùng `postEngagementRate()`.

### 3. **EDIT** `src/pages/Reports.tsx` — tab Engagement
- StatCard "Engagement rate" thêm icon `Info` với `Tooltip` (shadcn) giải thích: "Weighted avg theo công thức chuẩn từng platform. Click vào từng platform bên dưới để xem ER riêng."
- Bảng `byPlatform` đổi thành Table chính thức (đang là BarChart). Thêm cột:
  - Platform (Badge)
  - Reach
  - Engagements (likes+comments+shares+...)
  - **ER %** (per-platform, theo công thức chuẩn)
  - Posts
  - Tooltip trên header ER hiển thị `PLATFORM_FORMULA_DOCS[platform]` cho từng row.
- Giữ BarChart "Reach vs Likes" (ưa thích visual).
- Top posts table: thêm cột **ER %** mới.

### 4. **EDIT** `src/lib/reports/pdfBuilder.ts` & `csvBuilder.ts`
- Section "Engagement by Platform" trong PDF in thêm cột ER + footnote công thức.
- CSV export `byPlatform` thêm cột `engagement_rate_pct`, `formula`.

### 5. **NEW** `src/lib/reports/__tests__/engagementFormulas.test.ts`
Vitest unit tests cho `computeERParts`, `postEngagementRate`, `weightedEngagementRate` cover:
- Mỗi platform happy path
- Fallback (FB không có reach → dùng impressions)
- Aggregate weighted (so sánh với arithmetic mean để chứng minh khác)
- Empty/zero denominator → 0

### 6. **MEMORY**
Lưu rule mới vào `mem://ai-system/engagement-rate-formula-vn` để các tính năng analytics/AI insight sau dùng cùng công thức + cập nhật `mem://index.md`.

## Files dự kiến

- **new**: `src/lib/reports/engagementFormulas.ts`
- **new**: `src/lib/reports/__tests__/engagementFormulas.test.ts`
- **edited**: `src/hooks/reports/useEngagementReport.ts`
- **edited**: `src/pages/Reports.tsx` (tab Engagement)
- **edited**: `src/lib/reports/pdfBuilder.ts`
- **edited**: `src/lib/reports/csvBuilder.ts`
- **new**: `mem://ai-system/engagement-rate-formula-vn` + update `mem://index.md`

## Không động vào
- DB schema `social_post_metrics` — đủ cột.
- Edge function `sync-social-engagement` — vẫn fetch đúng metrics.
- Công thức không áp dụng cho `useReportOverview` "engagement total" (đang là count) — giữ nguyên semantics đếm tương tác thô.
