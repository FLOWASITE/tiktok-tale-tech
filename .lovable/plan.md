## Bối cảnh

Bạn vừa rotate key TikTok từ Sandbox → Production (app được duyệt). Hiện click "Kết nối TikTok" thì TikTok báo:
> Đã xảy ra lỗi — client_key

DB hiện lưu `consumer_key` dài 60 chars (`Y102oj…`) — trông giống ciphertext AES-GCM base64. Có 2 khả năng đang xảy ra:
1. Key Production được **paste thẳng vào DB** (plaintext) → `decrypt()` chạy ra rác → gửi `client_key=<rác>` lên TikTok.
2. Key được encrypt nhưng bằng `AI_ENCRYPTION_KEY` khác lúc decrypt (env logs cho thấy length 35 bytes → SHA-256 derive → key drift).

Cả 2 đều dẫn tới **TikTok nhận client_key sai format**.

## Giải pháp

### Bước 1 — Bạn làm thủ công (1 phút)
1. Vào **Admin → AI Management → Social Platforms → TikTok**
2. Xoá Client Key/Secret cũ, **paste lại Client Key + Client Secret Production** từ TikTok Developer Portal
3. Save → bấm **Test Connection** (đã có sẵn `test-tiktok-credentials`)
4. Trong TikTok Developer Portal → app Production, đảm bảo **Redirect URI** có:
   ```
   https://rllyipiyuptkibqinotz.supabase.co/functions/v1/tiktok-oauth-callback
   ```

### Bước 2 — Tôi code (hardening để lần sau không lặp lại)

**`supabase/functions/connect-social/index.ts`** (block TikTok ~dòng 810-835):
- Sau khi decrypt `consumerKey`, validate format: TikTok client key là **18-20 ký tự lowercase alphanumeric** (regex `^[a-z0-9]{16,24}$`).
- Nếu không match → throw lỗi tiếng Việt:
  > "Client Key TikTok không hợp lệ (length=X). Vào Admin → Social Platforms → TikTok và **nhập lại** Client Key/Secret Production. Đừng update trực tiếp database."
- Log diagnostic an toàn: `console.log('[tiktok] client_key length=', len, 'prefix=', key.slice(0,4) + '***')` (KHÔNG log full key).

**`supabase/functions/_shared/crypto.ts`** — thêm sanity check trong `decrypt()`:
- Sau `TextDecoder.decode()`, kiểm tra output không chứa control bytes lạ (chỉ cho phép printable ASCII + tab/newline + UTF-8 hợp lệ).
- Nếu fail → throw `Decryption produced invalid output (encryption key mismatch?)` thay vì trả chuỗi rác.
- ⚠️ Edit này ảnh hưởng tất cả 157 functions dùng `decrypt()`. An toàn vì chỉ throw khi output **chắc chắn là rác** — plaintext hợp lệ (token, API key ASCII) không bị ảnh hưởng. Đây là behaviour change tốt: thay vì âm thầm trả rác → báo lỗi rõ.

**`supabase/functions/connect-social/index.ts` — `getGlobalPlatformCredentials`**:
- Hiện đang `catch` mọi error và trả `{null, null}` → nuốt thông tin chẩn đoán → user thấy "TikTok chưa được cấu hình" gây hiểu lầm.
- Sửa: phân biệt `decrypt error` (throw lên với message rõ) vs `DB fetch error` (giữ logic cũ).

## Files thay đổi

- `supabase/functions/connect-social/index.ts` — validate client_key format + sửa error handling
- `supabase/functions/_shared/crypto.ts` — sanity check sau decrypt

## Sau khi xong

- Nếu key Production hợp lệ + đã re-save qua UI → kết nối TikTok chạy bình thường.
- Nếu lỡ paste thẳng vào DB hoặc encryption key drift → user thấy ngay lỗi cụ thể với hướng dẫn sửa, không còn redirect tới TikTok rồi nhận lỗi mơ hồ.

## Lưu ý

Nếu sau khi re-save qua UI vẫn lỗi, gần như chắc chắn là **Redirect URI chưa whitelist** trong TikTok app Production — kiểm tra lại bước 4.