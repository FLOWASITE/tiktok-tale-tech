## Mục tiêu
Người dùng muốn kiểm tra: (1) bài viết có dùng keyword đã chọn không, (2) có internal link / backlink SEO không. Hiện `InternalLinksPanel` đã tồn tại nhưng **chưa được mount** vào viewer; còn audit keyword thì **chưa có**.

## Phần 1 — Keyword Coverage Audit Panel (mới)

**File mới**: `src/components/seo/KeywordCoveragePanel.tsx`

Logic:
- Input: `contentId`, `targetKeywordIds: string[]`, `clusterId?`, `contentText: string` (long-form như website/blog).
- Resolve keyword strings qua `useKeywordsByIds`.
- Với mỗi keyword tính:
  - `count` = số lần xuất hiện (case-insensitive, word-boundary, hỗ trợ tiếng Việt diacritics qua normalize NFC).
  - `inTitle` / `inH1` / `inH2` / `inFirstParagraph` / `inUrlSlug` (parse markdown headings).
  - `density %` = count / totalWords * 100.
  - Status:
    - `missing` (count = 0) — đỏ
    - `low` (1–2 lần, density < 0.5%) — vàng
    - `good` (3+ lần, density 0.5–2.5%, có trong heading) — xanh
    - `over` (density > 3%) — cam (cảnh báo nhồi nhét)
- Hiển thị:
  - Header: "Bao phủ từ khóa" + badge tổng quát (vd `4/6 OK`).
  - Progress bar tổng coverage %.
  - List từng keyword: chip status, count, density, các vị trí xuất hiện (T=Title, H2, P1...).
  - Nút "Quét lại" (recompute on-demand vì re-render rẻ).
  - Empty state khi `targetKeywordIds` rỗng → gợi ý link sang SEO Hub.

## Phần 2 — Mount panels vào `MultiChannelViewer.tsx`

Vị trí: sidebar trái, ngay dưới `ClusterContextCard` (lines ~1221–1229).

```tsx
{/* Keyword Coverage Audit (chỉ cho long-form) */}
{Array.isArray((content as any).target_keyword_ids) &&
 (content as any).target_keyword_ids.length > 0 &&
 ['website','blogger','wordpress'].includes(selectedChannel) && (
  <div className="p-2 border-b border-border/30">
    <KeywordCoveragePanel
      contentId={content.id}
      targetKeywordIds={(content as any).target_keyword_ids}
      clusterId={(content as any).cluster_id}
      contentText={getContentForChannel(content, selectedChannel) || ''}
    />
  </div>
)}

{/* Internal Links (long-form only) */}
{['website','blogger','wordpress'].includes(selectedChannel) && (
  <div className="p-2 border-b border-border/30">
    <InternalLinksPanel contentId={content.id} />
  </div>
)}
```

## Phần 3 — Polish

- Import `InternalLinksPanel` + `KeywordCoveragePanel` ở MultiChannelViewer.
- Cả 2 panel dùng `Card` border-dashed style để đồng bộ với `ClusterContextCard` (Soft Luxury).
- Không sửa edge function — `suggest-internal-links` đã sẵn sàng.

## Phần kỹ thuật

- **Word counting**: tách bằng `/\s+/`, lọc empty.
- **Match keyword**: build regex `new RegExp('\\b' + escapeRegex(kw) + '\\b', 'giu')` + fallback substring nếu không match (cho cụm có dấu).
- **Heading parse**: regex `^(#{1,3})\s+(.+)$` per line.
- **Density thresholds** dựa SEO best practice: ideal 0.5%–2.5%, warn >3%.
- Không cần migration; trường `target_keyword_ids` đã tồn tại trong `multi_channel_contents`.

## Files chạm
- **New**: `src/components/seo/KeywordCoveragePanel.tsx`
- **Edit**: `src/components/MultiChannelViewer.tsx` (2 imports + 2 mount blocks)
