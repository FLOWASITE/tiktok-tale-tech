
## Nguyên nhân thật
Client guard yêu cầu `topic.length ∈ [150, 300]`, nhưng model thực tế chỉ trả 88-139 ký tự → **drop 100% suggestions** → UI rỗng → "không tạo được chủ đề".

Backend repair pass cũng không kéo nổi lên 150 ký tự một cách ổn định với model flash-lite hiện tại.

## Plan sửa

### 1. Hạ ngưỡng tối thiểu xuống mức model đạt được thực tế
Đổi rule **150-300** → **80-300** ở cả 3 chỗ:

- `src/hooks/ai/useTopicAI.ts` (~dòng 759): `topic.length >= 80 && <= 300`
- `supabase/functions/topic-ai/index.ts`:
  - `TOPIC_MIN = 80` cho hard validation
  - prompt: "ĐỘ DÀI BẮT BUỘC: 80-300 ký tự, tối ưu 120-200"
  - repair pass: rewrite về 80-300 (dễ đạt hơn nhiều so với 150)
  - đổi cache key `v13-strict-150-300` → `v14-flex-80-300` để xoá cache cũ

### 2. Fallback mềm khi tất cả vẫn fail
Trong `useTopicAI.ts`, nếu sau filter còn 0 item:
- không drop sạch nữa
- giữ lại các item dài nhất (top 4) kể cả < 80 ký tự
- log warning thay vì xoá hết
- → đảm bảo UI **luôn có suggestion** để user chọn

### 3. Sửa lỗi React ref cảnh báo (phụ)
Console có warning:
```
Function components cannot be given refs.
Check the render method of CarouselForm → TopicBrainstormSheet
```
`TopicAIChatbot` đang nhận `ref` qua `chatbotHandleRef` nhưng không dùng `forwardRef`. Bọc lại bằng `forwardRef` để hết warning (không gây crash nhưng nhiễu log).

## Files sẽ sửa
- `src/hooks/ai/useTopicAI.ts` — hạ min length + fallback mềm
- `supabase/functions/topic-ai/index.ts` — prompt 80-300 + repair threshold + cache key v14
- `src/components/topic/TopicAIChatbot.tsx` — wrap forwardRef (nếu cần)

## Kết quả
- Suggestions hiện ra ngay (không bị drop sạch).
- Title dài 80-300 ký tự — đủ chi tiết, không ngắn lè như trước, mà model vẫn đạt được ổn định.
- Warning ref biến mất khỏi console.
