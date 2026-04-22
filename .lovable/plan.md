

# Telegram → Title = Topic Suggestion từ AI

## Mục tiêu

Khi user chat trong Telegram tạo bài (ví dụ "tạo bài đăng FB"), thay vì để title bị suy ra từ raw message hoặc heading của content, hệ thống sẽ:

1. Gọi **`topic-ai` action `suggest`** trước khi generate content
2. Lấy **suggestion đầu tiên** (đã được tối ưu 80-300 ký tự, có hook, dựa trên brand + industry + recent topics)
3. Dùng topic đó làm `topic` truyền vào `generate-multichannel` → cũng chính là **title** lưu vào `multi_channel_contents`

## Thay đổi cụ thể

### File: `supabase/functions/telegram-webhook/index.ts`

Trong `handleGenerateSingle` (sau khi resolve brand, trước khi gọi `generate-multichannel`):

1. **Thêm helper `suggestTopicFromAI(supabase, brand, channel, userPrompt)`**:
   - POST `/functions/v1/topic-ai` body:
     ```
     { action: 'suggest', organizationId, brandTemplateId,
       contentGoal: 'awareness',  // mặc định, hợp với social post
       format: channel === 'website' ? 'blog' : 'social',
       query: cleanedPrompt || undefined,           // hint cho AI
       categoryHint: cleanedPrompt || undefined,    // ưu tiên category nếu user nói rõ chủ đề
       skipWebSearch: true,        // nhanh — Telegram cần response < 40s
       forceRefresh: false }
     ```
   - Parse `data.suggestions[0].topic` → trả về string
   - Timeout 12s (AbortController). Nếu fail/timeout → return null → fallback logic cũ (`"Bài đăng <Channel> cho <Brand>"`)

2. **Sửa block tính `effectiveTopic` (dòng 1346-1354)**:
   - Logic mới (theo thứ tự ưu tiên):
     - **B1** Gọi `suggestTopicFromAI` → nếu có kết quả ≥ 20 ký tự → dùng làm `effectiveTopic`
     - **B2** Nếu fail → dùng `cleanedTopic` (nếu ≥ 4 ký tự)
     - **B3** Nếu vẫn không có → fallback `"Bài đăng <Channel> cho <Brand>"`
   - Log rõ source: `[handleGenerateSingle] Title source: ai_suggestion | cleaned_prompt | fallback`

3. **UX message khi đang chờ**: vẫn giữ thông báo "🎯 Đang viết 1 bài cho *Facebook*… _Thường mất 20-40 giây_" (cộng thêm 3-8s cho topic-ai là chấp nhận được).

### File: `supabase/functions/generate-multichannel/index.ts`

- **Verify**: khi field `topic` được truyền từ Telegram (đã là AI-generated suggestion), logic `extractTitleFromChannels` hiện tại sẽ override bằng heading của content nếu có `#` heading. → Cần **skip extract** khi caller gắn flag `useTopicAsTitle: true`.
- Thêm param `useTopicAsTitle?: boolean` vào request body. Khi `true` → dùng thẳng `topic` làm title, không parse content.
- Telegram caller set `useTopicAsTitle: true` mặc định.

## Files sẽ sửa

| File | Thay đổi |
|------|----------|
| `supabase/functions/telegram-webhook/index.ts` | Thêm `suggestTopicFromAI()`, gọi trước `generate-multichannel`, gắn `useTopicAsTitle: true` |
| `supabase/functions/generate-multichannel/index.ts` | Thêm support `useTopicAsTitle` flag; nếu `true` → dùng `topic` làm title, bỏ qua `extractTitleFromChannels` |

## Edge cases

- **User cung cấp chủ đề rõ**: VD "viết bài Facebook về serum HA mới" → `cleanedPrompt = "serum HA mới"` → topic-ai sẽ generate title như *"Serum HA mới: 5 lý do làn da bạn cần thử ngay tuần này — review từ chuyên gia"* → đẹp hơn nhiều so với "Serum HA mới".
- **User chỉ nói "tạo bài FB"**: `cleanedPrompt = ""` → topic-ai dùng brand industry + content_pillars sinh topic generic phù hợp brand → tránh title rỗng.
- **topic-ai timeout/fail**: Fallback an toàn về logic cũ → không block flow tạo bài.
- **Cache**: `topic-ai` đã có cache 4h theo `(industry, brandTemplateId, query, categoryHint)` → tránh gọi AI lặp khi user spam cùng prompt.

## Rủi ro

Thấp. Thêm 1 API call (~3-8s với cache hit ~50ms) trước generate-multichannel. Có timeout + fallback an toàn. Không thay đổi schema, không migration.

## Ngoài phạm vi

- Cho user chọn 1 trong N suggestion qua inline keyboard (sẽ làm pha sau nếu cần).
- Áp dụng pattern này cho campaign flow (multi-post) — campaign đã có strategy node lo phần đặt title.

