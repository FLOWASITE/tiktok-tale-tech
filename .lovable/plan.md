

## Nguyên nhân thật sự (KHÔNG phải tôi vừa sửa gì)

Tôi kiểm tra DB và phát hiện cấu hình đang xung đột giữa 2 tầng override:

### Cấu hình hiện tại trong DB

**Bảng `ai_channel_model_configs` (per-channel, ưu tiên cao nhất):**
| Channel | model_override | Tạo lúc |
|---|---|---|
| facebook | `qwen-max` (DashScope) | 2026-01-04 |
| **instagram** | **`anthropic/claude-3.5-haiku`** (Lovable Gateway) | **2026-01-04** |
| threads | `qwen-plus` (DashScope) | 2026-03-26 |
| linkedin | `moonshotai/kimi-k2` (OpenRouter) | 2026-01-06 |
| ... | ... | ... |

**Bảng `ai_function_group_configs` (group-level, ưu tiên thấp hơn):**
- text → `qwen-plus`

### Tại sao instagram lại đi Lovable Gateway

- Instagram trong DB từ **04/01/2026** đã được set `model_override = anthropic/claude-3.5-haiku`. Đây là model của Anthropic chạy qua Lovable Gateway.
- Theo logic ưu tiên trong `ai-config.ts` + `streaming-handler.ts` (dòng 271-272):
  ```
  channelConfig?.model ?? context.defaultModel
  ```
  → khi có channel override, nó BỎ QUA group override `qwen-plus`.
- Vì vậy instagram đi Lovable Gateway → Lovable hết credits → 402.
- Facebook may mắn vì channel override là `qwen-max` (DashScope) nên có user API key → chạy được.

### Tôi KHÔNG có sửa gì gây ra việc này
- Bản ghi instagram updated_at = `2026-01-04 09:39:47` — không có thay đổi gần đây.
- Trong các phiên làm việc gần đây, tôi chỉ sửa: `length-validator.ts`, `self-critique.ts`, `ai-hook-evaluator.ts`, `ContentQualityScore.tsx`, `useHookAI.ts`, `generate-brand-image/index.ts`. KHÔNG đụng vào bảng `ai_channel_model_configs`.
- Cảm giác "trước đây instagram đi qua dashscope/qwen-plus" có thể đến từ thời điểm bảng channel configs CHƯA có row instagram, lúc đó nó fallback xuống group `text = qwen-plus` (DashScope). Sau khi row instagram được thêm 04/01, channel override thắng → đi Lovable Gateway.

---

## Hướng xử lý (cần user duyệt)

### A. Sửa cấu hình data (nhanh nhất)
Tạo migration update row instagram trong `ai_channel_model_configs`:
- Đổi `model_override` từ `anthropic/claude-3.5-haiku` → `qwen-plus`
- Để đồng bộ với group text override mà user đang dùng
- Hoặc nếu user muốn instagram đi Claude thật, cần nạp credits Lovable Gateway

### B. Sửa logic ưu tiên (an toàn hơn lâu dài)
File: `supabase/functions/_shared/streaming-handler.ts` (dòng 271-272)
- Khi channel override model trỏ sang provider đang **OPEN circuit breaker** hoặc đã 402 trong 5 phút gần đây → tự động fallback xuống group override (`qwen-plus` DashScope) thay vì cứng đầu retry Lovable Gateway.
- Emit warning log `[channel-routing] instagram override claude-3.5-haiku skipped: gateway credits exhausted, falling back to qwen-plus`.

### C. UI cảnh báo cho admin
File: `src/hooks/useChannelModelConfig.ts` + page admin tương ứng
- Khi channel override model thuộc Lovable Gateway và Lovable đang hết credits → hiện badge vàng "⚠ Model này yêu cầu Lovable Gateway credits, hiện đã hết. Nội dung sẽ fallback DashScope."

### D. Dập 402 spam từ `generate-campaign-strategy`
Log cũng cho thấy `generate-campaign-strategy` mỗi lần đều thử Lovable Gateway trước rồi mới fallback DashScope → tốn 1 round-trip vô ích mỗi request.
- File: `supabase/functions/generate-campaign-strategy/index.ts`
- Khi đã có user dashscope key + Lovable đã 402 trong cooldown → bỏ qua Lovable, đi thẳng DashScope.

---

## File cần sửa
- Migration mới: update `ai_channel_model_configs` cho instagram (và rà các row khác có model thuộc Lovable Gateway như `youtube` đang dùng `gemini-2.5-flash-lite`)
- `supabase/functions/_shared/streaming-handler.ts` — provider-aware fallback
- `supabase/functions/_shared/ai-provider.ts` — expose circuit breaker state cho streaming-handler
- `supabase/functions/generate-campaign-strategy/index.ts` — skip Lovable khi cooldown
- `src/hooks/useChannelModelConfig.ts` + admin page — UI warning

## Tiêu chí nghiệm thu
- Chọn FB + IG → **cả 2 đi DashScope** (qwen-max + qwen-plus), không kênh nào còn rớt sang Lovable Gateway.
- Log không còn `[ai-provider] Lovable Gateway error: 402` từ multichannel/campaign-strategy.
- Admin UI hiển thị rõ row nào đang dùng Lovable Gateway model + cảnh báo nếu hết credits.
- Người dùng có thể 1-click "Reset instagram về group default (qwen-plus)" trong admin.

