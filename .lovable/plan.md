## Chẩn đoán

Tab "Liên kết" UI đã hoạt động, nhưng **0/680 bài** trong `multi_channel_contents` có `content_embedding`. Edge function `suggest-internal-links` query `find_related_content` qua pgvector — không có embedding thì không có kết quả → user thấy "Không có gợi ý mới" mãi.

Edge function `embed-content` đã tồn tại nhưng **không nơi nào trong codebase gọi nó**. Chỉ có 4/680 bài có `cluster_id` (silo grouping cũng yếu).

## Cần làm 3 việc

### 1. Backfill embedding cho 680 bài hiện có
Tạo edge function `backfill-content-embeddings` (admin-only):
- Query batch 20 bài chưa có `content_embedding` (ưu tiên long-form: `website_content` / `blog_content` / `wordpress_content` không rỗng)
- Với mỗi bài: ghép `title + topic + content[0..6000]`, gọi Lovable AI `text-embedding-004` → resize 384 dim → update `content_embedding`
- Trả về `{processed, remaining}` để gọi lặp
- Thêm UI button trong `AdminSeoHub` (hoặc trang admin SEO có sẵn) "Backfill embeddings" với progress counter

### 2. Auto-embed khi tạo / cập nhật nội dung mới
Trong `generate-multichannel/index.ts` (sau khi insert/update `multi_channel_contents` thành công):
- Fire-and-forget invoke `embed-content` với `content_id` + text ghép từ long-form fields
- Không block response chính

Tương tự cho `regenerate-channel` action và bất cứ chỗ nào write long-form content.

### 3. Auto-trigger embed khi mở SEO Insights cho bài chưa có embedding
Trong `SeoInsightsSheet.tsx`:
- Khi mở sheet, check `content.content_embedding == null` (cần thêm field này vào `transformContent` của `useMultiChannelContents`)
- Nếu null + có long-form text → fire `embed-content` 1 lần, sau đó `InternalLinksPanel` auto-scan như đã setup
- Hiển thị toast "Đang tạo chỉ mục ngữ nghĩa..." để user hiểu vì sao lần đầu chậm

### Tùy chọn (không bắt buộc)
- Cluster coverage cũng yếu (4/680). Có thể thêm step trong wizard SEO yêu cầu chọn `cluster_id` khi tạo long-form, nhưng để xử lý sau.

## Files chạm
- **New**: `supabase/functions/backfill-content-embeddings/index.ts`
- **Edit**: `supabase/functions/generate-multichannel/index.ts` (fire-and-forget embed)
- **Edit**: `src/components/seo/SeoInsightsSheet.tsx` (auto-trigger embed nếu thiếu)
- **Edit**: `src/hooks/useMultiChannelContents.ts` (expose `content_embedding` flag — chỉ cần `has_embedding: boolean` để tránh tải vector lớn)
- **Edit**: `src/pages/AdminSeoHub.tsx` (nút backfill + counter)

Không cần migration mới (table/column đã tồn tại).

## Kết quả mong đợi
- Sau khi backfill chạy xong (~5-10 phút cho 680 bài), tab "Liên kết" sẽ trả top-K bài liên quan với % similarity thực
- Bài mới tạo từ giờ tự động được embed → gợi ý nội bộ sẵn sàng ngay khi mở viewer
