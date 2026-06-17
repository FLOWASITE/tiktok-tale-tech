## Vì sao "đã đổi model" mà vẫn lỗi

Dữ liệu trong DB cho thấy có **3 vấn đề khác nhau** chồng lên nhau, đổi model chỉ giải quyết được 1 phần:

### 1. Cấu hình `deepseek-v4-pro` cho agent `strategy` KHÔNG được dùng
- DB: `ai_agent_model_configs.strategy.model_override = deepseek-v4-pro` (global, `organization_id = NULL`).
- Nhưng log `ai_metrics` 24h gần nhất của `generate-campaign-strategy` **luôn chạy `google/gemini-3-flash-preview` rồi fallback `qwen-plus`** — không thấy `deepseek-v4-pro` lần nào.
- Lý do: code `generate-campaign-strategy/index.ts` line 262-268 query `ai_agent_model_configs` với `.eq("organization_id", organization_id)` — chỉ khớp config có đúng org đó. Config global (org=NULL) bị bỏ qua, nên rơi về default hard-code `google/gemini-3-flash-preview`.
- Đây là job cron/agent chạy mỗi giờ → bùng lỗi liên tục dù user không bấm gì.

### 2. Task `generate-multichannel` chết ở `prep-done` 18%
- Task mới nhất `49615573...` có `organization_id = NULL`, dừng ở `prep-done` rồi mất heartbeat 5 phút → bị `recover-stale` đánh `failed`.
- Frontend `useStreamingGeneration` insert task lấy `formData.organization_id`, nhưng `MultiChannelCreate` **không gắn** `organization_id` vào `formData` trước khi gọi `streamGenerate()` → task org=NULL.
- Edge function nhận org=NULL → tier check + dedup + persona fit + cache đều fallback, nhưng chính ra task không chết vì lỗi AI mà vì **edge function timeout ở pha song song 15 kênh không kịp heartbeat**.

### 3. Fallback chain hỏng
- `ai_provider.ts` khi Lovable Gateway 402 sẽ rơi về `qwen-plus`, nhưng tài khoản DashScope đang trả `400` (key sai hoặc model không hợp lệ với DashScope intl endpoint).
- Khi `fallback_model` rỗng trong `ai_agent_model_configs`, code ép `qwen-plus` mặc định → vô tác dụng.

## Kế hoạch sửa

**A. `generate-campaign-strategy` — đọc đúng config**
- Đổi query: thử `organization_id = orgId` trước, nếu rỗng thì lấy global `organization_id IS NULL` (theo pattern hiện có ở các function khác như `getAIConfig`).
- Bỏ ép `qwen-plus` mặc định khi `fallback_model` rỗng → để `ai-provider.ts` tự fallback Lovable gemini-2.5-flash (đã có sẵn last-resort).

**B. `MultiChannelCreate` + `useStreamingGeneration` — bắt buộc organization_id**
- `MultiChannelCreate.handleGenerate`: gắn `organization_id: currentOrganization?.id` vào `fullData`; nếu chưa có workspace thì block + toast.
- `useStreamingGeneration`: đọc cả `organization_id` và `organizationId` từ formData khi insert `generation_tasks` + khi gửi body cho edge function.

**C. `generate-multichannel` — fail sớm + heartbeat trong pha song song**
- Trong vòng lặp `generateChannelsParallel`, nếu phát hiện AI trả 402/credit-exhausted hoặc tất cả channel lỗi → `failTask` ngay với message tiếng Việt rõ ràng, đóng SSE thay vì chờ 5 phút.
- Bật heartbeat tick mỗi 20s trong pha pha song song (hiện chỉ có heartbeat ở pha prep), để cron `recover-stale` không nhầm là zombie.

**D. Kiểm tra sau sửa**
- Bấm tạo đa kênh thật, query `generation_tasks` xác nhận task mới có `organization_id`, status đi qua `prep-done → ai → finalize → completed`.
- Query `ai_metrics` của `generate-campaign-strategy` xác nhận `models_used = {default: deepseek-v4-pro}` thay vì `google/gemini-3-flash-preview`.
- Nếu vẫn lỗi DashScope 400 thì là vấn đề `DASHSCOPE_API_KEY` cần rotate (báo riêng để user thay key).

## Phạm vi code thay đổi
- `supabase/functions/generate-campaign-strategy/index.ts` (query agent config + bỏ ép qwen-plus)
- `supabase/functions/generate-multichannel/index.ts` (heartbeat + fail sớm trong pha song song)
- `src/pages/MultiChannelCreate.tsx` (gắn organization_id)
- `src/hooks/useStreamingGeneration.ts` (đọc cả 2 dạng key + gửi xuống backend)

Không động vào schema DB, không động vào `_shared/ai-provider.ts` (giữ nguyên fallback chain).