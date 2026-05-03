## Còn gì có thể tối ưu cho SEO Hub

Sau khi rà OverviewTab + cấu trúc 6 tabs hiện tại, còn 5 nhóm tối ưu có ROI rõ ràng. Tôi đề xuất chọn lọc, không làm tất cả tránh over-engineering.

### 1. Gom shared queries (đã ghi trong plan.md nhưng chưa làm)
Hiện `seo_keywords` được fetch riêng ở 4 nơi (Overview, Explorer, Pillars, RankTracker) với 4 cache keys khác nhau → 4 round-trip cho cùng dataset.

**Fix:** Tạo `src/hooks/useSeoKeywords.ts` + `useSeoPillars.ts` dùng chung `queryKey: ["seo-keywords", orgId]` với `staleTime: 30s`. Refactor 4 components qua hooks.

**Lợi ích:** sau lần đầu mở Overview, chuyển sang Explorer/Pillars là instant (cache hit), invalidate 1 chỗ là toàn bộ tab cập nhật.

### 2. OverviewTab: phân trang/virtualize
- `orphanKeywords.slice(0, 100)` đang render 100 row table có 2 Select mỗi row → 200 Radix Select instances. Trên viewport 707px khá nặng.
- `cannibalized` không giới hạn, có thể vài chục hàng.

**Fix:**
- Mặc định show 25, có "Hiện thêm" button.
- Hoặc dùng `useDeferredValue` cho list khi search/filter (sẽ thêm ở mục 4).

### 3. Bulk actions cho Orphan
Hiện phải sửa từng row. Thêm:
- Checkbox chọn nhiều orphan keyword.
- Action bar: "Gán vào pillar X" / "Gán vào page Y" / "Tạo content gộp" cho selection.

Giảm 10 click thành 1 khi triage 20 orphan cùng pillar.

### 4. Search/filter ngay trong Overview
Hiện 4 sub-tab Orphan/Gap/Cannibal/Contents đều list-only. Thêm 1 ô `Input` search keyword + `Select` filter funnel stage (TOFU/MOFU/BOFU) ở đầu mỗi tab. Persist qua query param `?q=&stage=` để deep-link.

### 5. Optimistic update + auto-refresh cho mutations
- `quickAssign` đang `invalidateQueries` → refetch full 1000 keyword. Đổi sang `setQueryData` patch local row → instant UI, không round-trip thừa.
- `keepWinner` tương tự.

### 6. Background warning badges trên TabsList chính
Trên `AdminSeoHub`, badge nhỏ cạnh tab Overview hiển thị số orphan + cannibal cao (vd `Overview ⚠ 12`). Không cần mở tab cũng biết có việc cần làm. Badge tính từ shared hook ở mục 1 → free.

---

## Đề xuất scope sprint này

Làm **mục 1, 2, 5** (đụng nhau, nên gộp):
- Tạo 2 hooks shared.
- Refactor OverviewTab + KeywordExplorerTab + PillarsTab + RankTrackerTab dùng hooks.
- Thêm pagination (25/page) cho Orphan + Cannibal.
- Optimistic update cho `quickAssign` + `keepWinner`.

Hoãn **3, 4, 6** sang sprint sau (cần thiết kế UX kỹ hơn, dễ over-build).

### Files

**Tạo**
- `src/hooks/useSeoKeywords.ts`
- `src/hooks/useSeoPillars.ts`

**Sửa**
- `src/components/admin/seo-keywords/OverviewTab.tsx` — dùng hooks, paginate, optimistic
- `src/components/admin/seo-keywords/KeywordExplorerTab.tsx` — dùng hooks
- `src/components/admin/seo-keywords/PillarsTab.tsx` — dùng hooks
- `src/components/admin/seo-keywords/RankTrackerTab.tsx` — dùng hooks (nếu fetch keywords)

**Không đổi:** DB schema, RLS, edge functions.

Approve để tôi triển khai, hoặc cho biết muốn thêm/bớt mục nào.
