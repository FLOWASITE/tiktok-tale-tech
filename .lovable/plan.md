## Mục tiêu
Tab **SEO → Track → Liên kết** hiện tại không giải thích nhiệm vụ của 3 view (Backlinks / Internal links / Pool URL) → user không hiểu để dùng. Bổ sung 3 lớp UX để tự giải thích.

## Thay đổi

### 1. `src/components/admin/seo-keywords/LinksWorkspace.tsx`
- Thêm **Onboarding banner** ở đầu (dismissible, lưu `localStorage: seo-links-onboarding-dismissed`):
  - Tiêu đề: "Tab Liên kết hoạt động thế nào?"
  - 3 cột giải thích ngắn cho Backlinks / Internal / Pool URL (1-2 dòng mỗi cột)
  - Workflow 3 bước: Connect WP/Blogger → Publish multichannel có blog → Bấm "Gợi ý liên kết nội bộ"
  - Nút "Đã hiểu, ẩn đi"
- Thêm **tooltip (?)** cạnh mỗi KPI (Owned backlinks / Internal links / Bài có link mạnh / Bài thiếu link) — giải thích công thức + cách tăng số.
- Mở rộng dòng mô tả dưới segmented toggle: thêm 1 dòng "Tăng bằng cách: …" tùy view.

### 2. `src/components/admin/seo-keywords/BacklinksTab.tsx`
- Cải thiện **empty state** (khi `data.rows.length === 0`):
  - Hiện tại: hiển thị table trống.
  - Mới: card hướng dẫn — "Chưa có backlink nào. Backlink tự sinh khi bạn publish multichannel có chèn link blog (Automated Social Backlinking)." + nút CTA → `/multichannel`.

### 3. `src/components/admin/seo-keywords/InternalLinksOverview.tsx`
- Cải thiện **empty state** (đã có 1 dòng text, nâng cấp thành card với CTA):
  - "Chưa có liên kết nội bộ. Mở 1 bài long-form → bấm 'Gợi ý liên kết nội bộ' để AI đề xuất link giữa các bài cùng cluster (Jaccard similarity)."
  - Nút CTA → `/multichannel?filter=longform`.
- Thêm tooltip cho 4 cột header: Internal in / Internal out / Backlinks / Equity (giải thích công thức `Equity = in + backlinks`, ngưỡng ≥3 = mạnh, =0 = đói link).

### 4. `src/components/admin/seo-keywords/ExternalLinksTab.tsx` (nếu chưa có empty state rõ)
- Empty state: "Pool URL trống. Connect WordPress / Blogger để tự sync URL bài viết, hoặc upload sitemap.xml."
- Nút CTA → trang Connections.

## Không thay đổi
- Hook (`useBacklinks`, `useInternalLinksOverview`, `useExternalLinkStats`) — đang chạy đúng.
- Edge function `suggest-internal-links` — đang OK.
- Schema DB.

## Kết quả mong đợi
User mới mở tab thấy ngay banner giải thích 3 view + workflow → biết cần làm gì để có data. KPI có tooltip giải thích công thức. Empty state có CTA dẫn đến hành động cụ thể.
