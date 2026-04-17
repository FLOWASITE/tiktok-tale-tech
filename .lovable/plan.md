

## Goal
Tăng độ dài nội dung mô tả topic trong "Gợi ý chủ đề" lên **tối thiểu 300 ký tự**, để mỗi gợi ý đầy đủ và có chiều sâu hơn (không bị quá ngắn như hiện tại).

## Phân tích hiện trạng
File: `supabase/functions/topic-ai/index.ts` (action `suggest`, hàm `buildSuggestPrompts`)

Trong OUTPUT FORMAT (dòng ~1506-1524), AI đang được yêu cầu:
- `"topic"`: Tiêu đề 15-50 từ
- `"reasoning"`: **"Lý do ngắn gọn (1-2 câu)"** ← đây là field hiển thị làm "nội dung mô tả" trong card (thấy ở `TopicMobileCard.tsx` dòng 222-226 và `TopicIdeaCard.tsx`).

→ Vì `reasoning` được yêu cầu "ngắn gọn 1-2 câu" nên AI thường trả ~80-150 ký tự, gây cảm giác "hơi ngắn".

## Changes

### 1. `supabase/functions/topic-ai/index.ts` — action `suggest`

Trong `buildSuggestPrompts()` (dòng ~1506-1524), thay đổi instruction cho field `reasoning`:

**Trước:**
```
"reasoning": "Lý do ngắn gọn (1-2 câu)",
```

**Sau:**
```
"reasoning": "Mô tả chi tiết về topic: bao gồm (1) góc tiếp cận / angle, (2) vì sao topic này phù hợp với brand & mục tiêu, (3) value chính mang lại cho audience, (4) gợi ý hook hoặc key message. TỐI THIỂU 300 ký tự, TỐI ƯU 350-500 ký tự. Viết tự nhiên, không gạch đầu dòng.",
```

Đồng thời thêm rule kiểm tra ở phần checklist cuối system prompt:
```
- Mỗi field "reasoning" PHẢI ≥ 300 ký tự (đếm cả khoảng trắng). Nếu < 300, BẮT BUỘC viết lại dài hơn với nội dung có giá trị (KHÔNG nhồi từ rỗng).
```

### 2. (Optional, nhẹ) Validation client-side
Trong `parseTopicSuggestions()` (~dòng 1551), không thay đổi schema — chỉ giữ nguyên. Không cần reject topic ngắn để tránh mất kết quả khi AI lỡ trả ngắn; chỉ enforce qua prompt là đủ.

### 3. Tăng `max_tokens` nếu cần
File `supabase/functions/_shared/ai-config.ts` — kiểm tra default cho `topic-ai`. Nếu hiện max_tokens < 4000, nâng lên ~6000 để có đủ chỗ cho 8-10 topics × 500 chars reasoning. (Sẽ kiểm tra cụ thể khi implement và chỉ tăng nếu cần.)

## Result
- Mỗi gợi ý chủ đề có phần mô tả (`reasoning`) **dày hơn, ≥ 300 ký tự**, đủ thông tin về angle / lý do phù hợp / value cho audience.
- Card topic trong UI (mobile drawer + idea card) tự động hiển thị mô tả dài hơn — không cần đổi component nào.
- Không ảnh hưởng cấu trúc data, chỉ thay đổi nội dung sinh ra.

