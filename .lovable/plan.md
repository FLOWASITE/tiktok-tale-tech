## Vấn đề

Bài long-form đang có đầy đủ data (`website_content` ~6000 ký tự, `target_keyword_ids` 2-4 keyword, `cluster_id` có) nhưng SEO Insights không hoạt động đúng:

1. **Tabs không switch** — `useEffect([open])` reset `tab` về `"overview"` mỗi lần mở, nhưng khi `dims.length` đổi giữa các render, fallback đẩy về tab khác → click bị "nhảy lại". Ngoài ra `TabsContent` nằm trong `<div className="overflow-y-auto">` ngoài `<Tabs>` Root scope vẫn OK, nhưng do `setTab` bị `useEffect` ghi đè khi state phụ (linkCount, clusterCov) load xong → rerun render → `dims` đổi → effect chạy lại.
2. **Tab "Tổng quan" hiện 0/100** vì `linkCount` và `clusterCov` ban đầu = `null` → `linkPct(null)=0` và `clusterCov?.pct ?? 0` = 0, kéo health score xuống dù chưa load xong.
3. **Tab "Từ khóa" / "Liên kết" / "Cluster"** chưa hiện data ngay khi mở vì các effect chỉ chạy khi `open=true` — nhưng panel con (`InternalLinksPanel`) yêu cầu user bấm "Quét" mới có suggestion.
4. **Dimension card không clickable rõ ràng** — button `<button>` lồng button bên trong Card gây nhầm UX.

## Fix

### File: `src/components/seo/SeoInsightsSheet.tsx`

**A. Fix tab state**
- Bỏ `useEffect([open])` reset tab. Thay bằng: chỉ set tab mặc định 1 lần khi `open` chuyển từ `false → true`, dùng `useRef` flag.
- Đảm bảo `TabsContent` nằm TRỰC TIẾP bên trong `<Tabs>` (hiện đang OK, nhưng wrap div phải là descendant của Tabs Root — verify).

**B. Tách "loading" khỏi "score = 0"**
- Thêm state `linksLoading`, `clusterLoading`. Khi loading, dimension đó dùng badge "—" thay vì 0, và **không tính** vào health score (loại khỏi `dims` cho đến khi load xong).
- Health score chỉ tính trên các dimension đã có data thật.

**C. Auto-scan internal links khi mở Sheet**
- Trong tab "Liên kết", thêm prop `autoScan` cho `InternalLinksPanel`: nếu `saved.length === 0` và chưa scan, tự gọi `scan()` 1 lần khi mount.
- Hoặc đơn giản hơn: trong `SeoInsightsSheet` load luôn count + saved internal links + nếu = 0 thì gọi `suggest-internal-links` lấy preview top 3 hiển thị inline trong overview.

**D. Cải thiện content extraction**
- Hiện truyền `getContentForChannel(content, selectedChannel) || website_content`. Nếu user đang xem channel "blogger" mà `blogger_content` rỗng (theo data: nhiều bài blog_len=0) → fallback `website_content` đã đúng, giữ nguyên.

**E. Polish**
- Thay nested `<button>` trong dimension cards bằng `<div role="button" tabIndex={0}>` + onClick.
- Header sheet thêm chip channel đang phân tích ("Đang phân tích: Website").
- Tab "Từ khóa": thêm summary "X/Y keyword đã có mặt" trên đầu (đã có trong panel, chỉ cần reuse).
- Empty state cho mỗi tab có CTA rõ: nút "Quét gợi ý" cho tab Liên kết khi rỗng.

### File: `src/components/seo/InternalLinksPanel.tsx`

- Thêm prop `autoScanOnMount?: boolean`. Khi true + `saved.length === 0` + chưa scan, tự gọi `scan()` sau khi `loadSaved()` resolve.

### File: `src/components/MultiChannelViewer.tsx` (line 1223)

- Truyền thêm prop `channelLabel={channelConfig[selectedChannel]?.name}` cho hiển thị chip.

## Files chạm
- **Edit**: `src/components/seo/SeoInsightsSheet.tsx` (refactor tab state + loading state + auto-load)
- **Edit**: `src/components/seo/InternalLinksPanel.tsx` (thêm `autoScanOnMount`)
- **Edit**: `src/components/MultiChannelViewer.tsx` (truyền `channelLabel`)

Không cần migration, không sửa edge function.
