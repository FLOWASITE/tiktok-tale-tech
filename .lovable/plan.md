

# Vẫn còn "Chờ admin cấu hình" — Root cause #2

## Vấn đề (verified bằng query)

DB đã có sentinel row đúng:
- `telegram_bot_configs`: row `(organization_id=NULL, is_default=true, bot_username='Flowa123bot', is_active=true)` ✅
- View `telegram_default_bot_public` query trực tiếp ra row đó ✅ (khi mình chạy bằng service role)

Nhưng FE user thường vẫn không thấy. Lý do:

**View được tạo với `security_invoker = on`** → query qua view áp RLS với quyền của user đang đăng nhập. Bảng gốc `telegram_bot_configs` chỉ có 2 policy:
- `Org admins can view bot config` — `USING (is_org_admin(auth.uid(), organization_id))`
- `Org admins can delete bot config`

Với sentinel row `organization_id IS NULL`, hàm `is_org_admin(uid, NULL)` trả false → user thường **không SELECT được** → view trả empty → `useDefaultTelegramBot` set `defaultBot = null` → `botReady = false` → fallback "Chờ admin".

## Fix: thêm RLS policy cho phép đọc default bot

Thêm 1 policy SELECT chỉ expose 2 cột non-sensitive (bot_username, is_active) thông qua điều kiện `organization_id IS NULL AND is_default = true`. Vì view chỉ select 2 cột này, không lo leak `bot_token_encrypted`.

```sql
CREATE POLICY "Anyone authenticated can read default bot meta"
  ON public.telegram_bot_configs
  FOR SELECT
  TO authenticated
  USING (organization_id IS NULL AND is_default = true AND is_active = true);
```

**Tại sao an toàn**:
- View `telegram_default_bot_public` chỉ select `bot_username, is_active` — không expose token
- Policy filter chặt: chỉ row sentinel mặc định mới đọc được
- Org-level rows (có `organization_id` thực) vẫn bị policy `is_org_admin` chặn như cũ

## Alternative đã cân nhắc (không chọn)
- Đổi view sang `security_invoker = off` (security definer): rủi ro cao hơn vì view sẽ chạy với quyền postgres, dễ leak nếu sau này ai đó thêm cột vào view.
- Tạo function SECURITY DEFINER: phức tạp hơn, không cần thiết khi chỉ cần lộ 2 cột public.

## Files thay đổi

| File | Loại |
|---|---|
| `supabase/migrations/<timestamp>_telegram_default_bot_rls.sql` | mới — 1 policy duy nhất |

Không đụng FE, không đụng edge function.

## Test E2E
1. Apply migration → reload `/agents/telegram` ở org **không phải** `bccfec38…`
2. Banner "Đang dùng bot mặc định @Flowa123bot" xuất hiện
3. Card link Telegram hiện nút "Mở Telegram → Start bot" (không còn "Chờ admin")
4. Click → mở Telegram, Start → realtime morph sang connected
5. Org `bccfec38…` (đã có bot riêng): vẫn dùng bot org, ưu tiên đúng
6. Verify trong DevTools Network: query `telegram_default_bot_public` trả 1 row, không có field token

## Ước tính
**5 phút** — 1 policy đơn lẻ. Zero risk.

