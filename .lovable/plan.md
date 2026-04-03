

# Sửa lỗi: Bài viết từ Agent thiếu điểm GEO và Critique

## Nguyên nhân gốc

### Bug 1: `fetchContentText` dùng sai bảng (Nghiêm trọng)
- Trong giai đoạn `quality` của agent-pipeline, `contentId` là ID của `multi_channel_contents` (MCC)
- Nhưng `fetchContentText()` (dòng 1786) truy vấn bảng `core_contents` với MCC ID → **không tìm thấy gì**
- Kết quả: `contentText` rỗng → `geo-score-content` không được gọi → không có điểm GEO

### Bug 2: GEO chỉ score core content, không score channel texts
- Luồng thủ công (`triggerAutoGEOScore`): gộp tất cả nội dung kênh (facebook, instagram, ...) rồi score
- Luồng Agent: chỉ lấy `core_contents.content` → dù có fix Bug 1, nội dung score vẫn khác biệt và không đầy đủ

### Bug 3: `contentType` truyền cho `geo-score-content` không đồng nhất
- Agent truyền `"core_content"`, thủ công truyền `"multi_channel"` → `geo_content_scores` lưu với type khác nhau cho cùng loại nội dung

## Kế hoạch sửa

### 1. File `supabase/functions/agent-pipeline/index.ts` — `fetchContentText`
- Khi `contentType === "multichannel"`: **thử `multi_channel_contents` trước**, gộp tất cả channel texts giống luồng thủ công
- Fallback sang `core_contents` nếu MCC không tìm thấy (trường hợp contentId là core_content ID)

### 2. File `supabase/functions/agent-pipeline/index.ts` — GEO scoring call
- Sửa `contentType` truyền cho `geo-score-content`: dùng `"multi_channel"` thay vì `"core_content"` khi pipeline là multichannel
- Đảm bảo đồng nhất với luồng thủ công

### 3. Tổng: 1 file edge function, 2 chỗ sửa

