
## Hiểu lại vấn đề
Phần "khoanh đỏ" trong ảnh là **topic title** (tiêu đề chủ đề), không phải reasoning. Bạn muốn tiêu đề dài hơn — mục tiêu **80-150 ký tự**.

Hiện tại prompt `topic-ai` chỉ yêu cầu `"Tiêu đề chi tiết (15-50 từ)"` — đếm theo "từ" rất mơ hồ với tiếng Việt, nên AI thường trả title ngắn (~50-80 ký tự).

## Plan

### 1. Sửa prompt `topic-ai` → ép độ dài title theo ký tự
File: `supabase/functions/topic-ai/index.ts`, hàm `buildSuggestPrompts`, dòng ~1509.

**Trước:**
```
"topic": "Tiêu đề chi tiết (15-50 từ)"
```

**Sau:**
```
"topic": "Tiêu đề chi tiết, hấp dẫn, có hook + ngữ cảnh rõ ràng. ĐỘ DÀI BẮT BUỘC: 80-150 ký tự (đếm cả khoảng trắng). Tối ưu: 100-130 ký tự. Có thể dùng dấu `:` hoặc `—` để tách hook và mô tả phụ. KHÔNG ngắn hơn 80 ký tự."
```

Thêm vào checklist cuối system prompt (dòng ~1528):
```
- Mỗi field "topic" PHẢI dài 80-150 ký tự. Nếu < 80, BẮT BUỘC viết lại dài hơn (thêm hook, ngữ cảnh, đối tượng, kết quả). KHÔNG nhồi từ rỗng.
- Cấu trúc gợi ý: "[Hook/Số liệu/Câu hỏi]: [Đối tượng] [Vấn đề/Giải pháp] [Kết quả/Lợi ích]"
```

### 2. Bust cache
Đổi cache key `topic-suggestions-v10-long` → `topic-suggestions-v11-long-title` để force regenerate (vì cache cũ vẫn chứa title ngắn).

### 3. Bỏ truncate UI ở chip suggestion
File: `src/components/TopicSuggestionPanel.tsx` dòng ~1023:
```tsx
{suggestion.topic.length > 70 ? suggestion.topic.slice(0, 70) + '…' : suggestion.topic}
```
Tăng giới hạn truncate lên **140 ký tự** để title 80-150 hiển thị trọn vẹn trong chip; đồng thời tăng `max-w-[420px]` lên `max-w-[560px]` cho khung rộng hơn.

### 4. Không sửa MAX_TOPIC_LENGTH (300 ký tự)
Ô input đã cho phép tới 300 ký tự, nên title 80-150 ký tự khi click chọn vẫn được giữ nguyên trong textarea — không cần đổi.

## Chi tiết kỹ thuật
- `supabase/functions/topic-ai/index.ts`:
  - dòng ~1509: đổi instruction `"topic"` sang ép 80-150 ký tự
  - thêm rule checklist title length
  - đổi cache key version
- `src/components/TopicSuggestionPanel.tsx`:
  - dòng ~1020-1023: nới truncate threshold + chip max-width

## Result
- AI sẽ sinh tiêu đề dài 80-150 ký tự (giàu hook + ngữ cảnh).
- Chip trong panel hiển thị đầy đủ title mới.
- Sau khi click, ô nhập chứa nguyên title dài, counter sẽ hiện ~80-150/300.
