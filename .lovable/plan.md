

# Fix X OAuth: Client Forbidden + Redirect sai

## Vấn đề 1: X Developer App chưa gắn Project

Log: `"reason":"client-not-enrolled"` — Token exchange OK nhưng API v2 (`/2/users/me`) bị chặn.

**Giải pháp:** Bạn cần vào [Twitter Developer Portal](https://developer.twitter.com):
1. Tạo một **Project** (nếu chưa có)
2. Gắn App hiện tại vào Project đó
3. Đảm bảo App có quyền **Read and Write**

Đây là yêu cầu bắt buộc của Twitter API v2 — không thể fix bằng code.

## Vấn đề 2: Error redirect về URL sai

Trong catch block (dòng 194-200), `getFrontendUrl(null)` fallback về `rllyipiyuptkibqinotz.lovableproject.com` — URL không tồn tại.

### Sửa `supabase/functions/x-oauth-callback/index.ts`

- Trong catch block: parse `state` để lấy `frontendOrigin` trước khi redirect error
- Thêm `https://tiktok-tale-tech.lovable.app` vào ALLOWED_ORIGIN_PATTERNS
- Đổi fallback URL từ `.lovableproject.com` sang preview URL đúng

| File | Thay đổi |
|------|----------|
| `supabase/functions/x-oauth-callback/index.ts` | Fix error redirect logic |

