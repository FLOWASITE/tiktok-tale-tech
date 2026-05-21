## Vì sao "Nội dung đa kênh" vừa tạo bị rỗng

Logs `generate-multichannel` (02:42:36Z) cho thấy:

```
[ai-provider] Function: critique-content, Model: deepseek-v4-flash (override)
[ai-provider] Primary provider: lovable                      ← SAI, phải là 'deepseek'
[ai-provider] Lovable Gateway error: 400 invalid model: deepseek-v4-flash
[streaming-mode] Parallel generation complete: 0/3 channels
  errors: { facebook: "API error: 400", instagram: "API error: 400", website: "API error: 400" }
[generate-multichannel] ⚠️ website channel selected but channelResults.website is empty - will save NULL
[Self-Critique] Refinement error: Payment required   ← fallback Lovable Gateway hết credit
TaskTracking: Task ... completed with result <id>    ← row được save nhưng rỗng
```

→ Content row được tạo, nhưng cả 3 channels = NULL nên UI "không có kết quả".

### Root cause

`supabase/functions/_shared/ai-provider.ts` ĐÃ có map `"deepseek-v4": "deepseek"` (line 58) — nhưng trong runtime, `getProviderFromModel("deepseek-v4-flash")` lại trả về `"lovable"`. Hai khả năng:

1. **Stale deployment** — generate-multichannel (và các edge function dùng shared module) đang chạy bản ai-provider.ts cũ, chưa có mapping `deepseek-v4`. Giống bug topic-ai vừa rồi: fix code đã apply nhưng function chưa tự redeploy để pull bản shared mới.
2. **forceProvider override** — critique/refine bên Self-Critique có thể đang truyền `forceProvider: 'lovable'` hoặc một biến môi trường cũ khiến routing sai.

→ Khả năng cao là (1) vì cùng pattern với topic-ai. Kiểm tra trong bước 1 của plan.

## Plan

### 1. Redeploy nhóm edge function dùng ai-provider để pull bản shared mới
   - `generate-multichannel`, `critique-content`, `refine-content`
   - Sau redeploy → trigger lại "Multichannel" với DeepSeek model → check logs phải thấy `Primary provider: deepseek` cho `deepseek-v4-flash`.

### 2. Nếu sau redeploy vẫn `Primary provider: lovable`
   - Mở `_shared/ai-provider.ts` thêm log debug ngay đầu `getProviderFromModel` để in `MODEL_TO_PROVIDER` keys + matched prefix.
   - Tìm callsite truyền `forceProvider` (Self-Critique, streaming-mode) — xoá nếu nó hard-code 'lovable'.

### 3. Hardening: thêm guard chống re-occur
   - Trong `getProviderFromModel`: nếu model bắt đầu bằng `deepseek-` và không match prefix DeepSeek direct cụ thể → log warning và default về `"deepseek"` thay vì rớt xuống lovable.
   - Trong `streaming-mode` (file generate-multichannel index): nếu **tất cả** channels lỗi, return HTTP 500 với error tổng hợp thay vì save row rỗng với `result_id` "completed". Hiện tại UI tưởng job xong nên không hiển thị error.

### 4. UX nhỏ: hiện banner lỗi khi content rỗng
   - `multi_channel_contents` row hiện vẫn được save với cả 3 cột channel = NULL. Frontend nên detect (mọi channel đều rỗng) → hiển thị "Tạo nội dung thất bại — provider lỗi, hãy thử model khác" + nút Retry, thay vì màn trống không giải thích.

## Files dự kiến chạm
- `supabase/functions/_shared/ai-provider.ts` — guard `deepseek-*` fallback
- `supabase/functions/generate-multichannel/index.ts` (hoặc `_shared/streaming-handler.ts`) — fail-loud khi 0/N channels
- 1 component multichannel result viewer — banner "all-empty"
- Redeploy: `generate-multichannel`, `critique-content`, `refine-content`

## Không làm
- Không đổi DB schema
- Không touch các edge function khác (chỉ redeploy nhóm liên quan)
- Không sửa client.ts / types.ts

Sau khi bạn approve, mình sẽ chạy bước 1 (redeploy + verify logs) trước, rồi mới apply guard + UI banner.
