

## Vấn đề

User bấm "Tạo link kết nối" → toast "Failed to send a request to the Edge Function". Edge function `telegram-link-token` fail.

## Nguyên nhân (đọc code)

`supabase/functions/telegram-link-token/index.ts` import `signLinkToken` từ `../_shared/telegram-client.ts`. Nếu module này throw lúc import (vd thiếu `TELEGRAM_LINK_SECRET` env var, hoặc lỗi crypto init), function crash trước khi return → client nhận `Failed to send a request`.

Cũng có khả năng:
- `telegram_bot_configs` table chưa có row cho org → trả 404 nhưng client lại hiện generic error
- `getServiceClient()` hoặc query `organization_members` lỗi schema

## Plan sửa

1. **Verify** edge function deploy & xem logs `telegram-link-token` để xác định lỗi thật (import error vs runtime).
2. **Check `_shared/telegram-client.ts`**: đảm bảo `signLinkToken` không throw ở top-level, lazy-load secret.
3. **Harden `telegram-link-token`**:
   - Try/catch quanh import-time side effects
   - Trả error JSON rõ ràng kèm `code` (`MISSING_SECRET`, `NO_BOT_CONFIG`, `NOT_MEMBER`)
   - CORS headers đầy đủ trên mọi response (kể cả 401/403/404/500)
4. **Frontend `useTelegramBinding.generateDeeplink`**: parse error body để hiện message tiếng Việt cụ thể thay vì generic "Failed to send".
5. **Nếu thiếu `TELEGRAM_LINK_SECRET` secret** → dùng `add_secret` để user nhập trước khi function chạy được.

## File cần chỉnh

- `supabase/functions/telegram-link-token/index.ts` — bọc import lazy, trả error chi tiết
- `supabase/functions/_shared/telegram-client.ts` — lazy init secret, không throw at import
- `src/hooks/useTelegramBinding.ts` — parse error body, hiện message rõ
- (nếu cần) yêu cầu thêm secret `TELEGRAM_LINK_SECRET`

## Kết quả

- Bấm "Tạo link kết nối" → hoặc thành công ra deeplink, hoặc thấy lỗi rõ ("Chưa cấu hình bot", "Thiếu secret", "Không thuộc org") thay vì "Failed to send".

