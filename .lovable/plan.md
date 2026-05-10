## Vấn đề
Edge function `import-brand-from-website` không boot được:
```
Uncaught SyntaxError: Identifier 'normalizeUrl' has already been declared
at supabase/functions/import-brand-from-website/index.ts:143
```
→ Mọi request POST đều trả network error, FE bắt thành `TypeError: Failed to fetch` và hiện toast "Không import được website" (đúng như session replay với `https://taf.vn`).

Nguyên nhân: lần patch trước thêm helper `extractVisualSignals` đã khai báo lại `normalizeUrl` (dùng để resolve absolute logo URL) trong khi file đã có sẵn 1 hàm `normalizeUrl` ở phía trên.

## Cách sửa
1. Mở `supabase/functions/import-brand-from-website/index.ts`, xác định 2 chỗ khai báo `normalizeUrl`.
2. Giữ lại bản gốc (xử lý input URL của user). Đổi tên bản trong `extractVisualSignals` thành `resolveAbsoluteUrl(href, baseUrl)` (hoặc inline logic `new URL(href, baseUrl).toString()`), cập nhật mọi call site bên trong hàm extractor.
3. Deploy lại function `import-brand-from-website` để verify boot không còn syntax error.
4. Test bằng `supabase--curl_edge_functions` POST `{ url: "https://taf.vn", stream: false }` → kỳ vọng JSON `success: true` (hoặc lỗi nghiệp vụ rõ ràng, không phải network fail).

## Out of scope
- Không đụng `import-brand-from-fanpage` (logs sạch).
- Không đổi schema SSE event hay UI.
