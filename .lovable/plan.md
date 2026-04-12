

# Fix lỗi BOOT_ERROR của facebook-oauth-callback

## Nguyên nhân

Edge function `facebook-oauth-callback` bị lỗi khởi động do **2 vấn đề**:

1. **Dòng 2 và 3 trùng lặp**: import `decryptGCM` / `encryptGCM` từ `crypto.ts` bị khai báo 2 lần, gây lỗi `Identifier 'decryptGCM' has already been declared`.
2. **Biến `supabaseUrl` chưa khai báo**: Dòng 128 sử dụng `supabaseUrl` nhưng không có dòng nào định nghĩa nó.

## Sửa

- Xóa dòng 3 (import trùng lặp)
- Thêm khai báo `const supabaseUrl = Deno.env.get('SUPABASE_URL')!;` trước khi sử dụng
- Redeploy edge function

## File thay đổi

- **Edit**: `supabase/functions/facebook-oauth-callback/index.ts` — Xóa dòng import trùng, thêm khai báo `supabaseUrl`

