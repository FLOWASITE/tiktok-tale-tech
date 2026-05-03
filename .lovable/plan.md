## Vấn đề hiện tại

SEO Hub có 7 tabs ngang hàng (Overview, Keywords, Pillars, Discover, Ranks, Enrichment, Pages) khiến user không biết bắt đầu từ đâu. Discover và Enrichment trùng chức năng "làm giàu keyword". Pillars / Keywords / Pages là 3 mảnh của cùng một workflow nhưng tách rời, không có đường đi rõ ràng.

## Định hướng mới: 4 tabs theo workflow SEO chuẩn

```text
1. DISCOVER   →   2. PLAN       →   3. PRODUCE   →   4. TRACK
   (tìm KW)        (cluster +        (landing       (rank +
                    mapping)          pages)         enrich logs)
```

### Tab 1 — Discover (gộp Discover cũ + Enrichment trigger)
**Mục đích**: Tìm keyword mới + làm giàu data
- Sub-tabs: **AI Research Lab** | **CSV Import** | **Enrich queue** (mini, chỉ hiện job đang chạy)
- Nút "Enrich keywords" nổi lên khi có keyword chưa có KD/intent
- Enrichment Jobs cũ (full log) → ẩn vào Drawer "Lịch sử enrichment" mở từ icon góc trên

### Tab 2 — Plan (gộp Pillars + Keywords Explorer)
**Mục đích**: Tổ chức keyword thành chiến lược nội dung
- **Layout 2 panel**: 
  - Trái: Pillar tree (sidebar collapse được) — list pillars + "Unassigned keywords" bucket
  - Phải: Bảng keyword của pillar đang chọn, có inline edit cluster, intent, funnel stage
- Click pillar → filter keywords. Click "Tất cả keywords" → full Explorer view
- Card metric trên đầu: Total KW, Pillars, Coverage %, Orphan count

### Tab 3 — Produce (đổi tên từ Pages)
**Mục đích**: Quản lý landing pages + content gắn với keyword
- Giữ `AdminSeoPages` hiện tại
- Thêm cột "Cluster" + "Target keywords" hiển thị link ngược về Plan
- Quick action "Tạo content cho keyword này" → navigate `/multi-channel/create?keywordIds=...`

### Tab 4 — Track (gộp Ranks + Overview signals)
**Mục đích**: Theo dõi performance + phát hiện vấn đề
- Sub-tabs: **Rank tracker** | **Health** (orphan, cannibalization, low coverage)
- Health view = phần Overview cũ nhưng actionable: mỗi vấn đề có nút "Fix" dẫn về Plan/Produce

## Overview tab → biến mất, thay bằng "Home banner"

Phần đầu trang (trên TabsList) trở thành **Hero strip**:
- 4 KPI cards: Keywords, Pillars active, Pages published, Avg rank
- Stepper trực quan "Discover → Plan → Produce → Track" — click bước nào nhảy tab đó
- Empty state: nếu org chưa có keyword → CTA lớn "Bắt đầu với AI Research Lab"

## Technical changes

### Files mới
- `src/components/admin/seo-hub/SeoHubHero.tsx` — KPI strip + workflow stepper
- `src/components/admin/seo-hub/PlanWorkspace.tsx` — 2-panel layout gộp Pillars + Keywords
- `src/components/admin/seo-hub/EnrichmentDrawer.tsx` — Sheet drawer chứa EnrichmentJobsTab cũ
- `src/components/admin/seo-hub/HealthPanel.tsx` — orphan/cannibal cards với CTA Fix

### Files sửa
- `src/pages/AdminSeoHub.tsx` — rebuild với 4 tabs mới + Hero
  - URL mapping: `?tab=overview|explorer|pillars|enrichment` → `track` (Health) hoặc `plan`
  - Giữ backward compat cho `?tab=enrichment&jobId=...` → mở Drawer
- `src/components/admin/seo-keywords/DiscoverTab.tsx` — thêm sub-tab "Enrich queue"
- `src/components/admin/seo-keywords/PillarsTab.tsx` + `KeywordExplorerTab.tsx` — refactor thành sub-component dùng trong PlanWorkspace
- `src/components/admin/seo-keywords/EnrichmentJobsTab.tsx` — bóc thành component dùng trong Drawer
- `AdminSeoPages` — thêm cột Cluster/Keywords + quick action

### URL backward compat
| URL cũ | Redirect tới |
|---|---|
| `?tab=overview` | `?tab=track&sub=health` |
| `?tab=explorer` | `?tab=plan` |
| `?tab=pillars` | `?tab=plan&pillar=...` |
| `?tab=enrichment` | `?tab=discover` + auto open Drawer |
| `?tab=ranks` | `?tab=track&sub=ranks` |
| `?tab=pages` | `?tab=produce` |

### Không đụng
- Edge functions, schema DB, RLS — pure frontend IA refactor
- Logic enrichment, pillar CRUD, rank tracker giữ nguyên — chỉ tái sắp xếp UI

## Risk & rollout
- Risk thấp: chỉ frontend, có URL redirect, không mất dữ liệu
- Rollout 1 lần, không cần feature flag
- Sau khi merge, cập nhật memory `mem://features/seo/topic-cluster-architecture-vn` về IA mới
