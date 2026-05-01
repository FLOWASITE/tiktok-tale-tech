## Bug: Post Facebook không có ảnh

### Nguyên nhân (xác định chắc chắn từ DB + logs)

`channel_images.facebook` của bài "Lê Thu Hương..." chứa URL:
```
…/social/unassigned/<id>/facebook-with-text-1777631343470.svg
```

→ File này do edge function **`overlay-text-canvas`** tạo: dùng [Satori](https://esm.sh/satori) để render text overlay, **chỉ output SVG**, rồi upload thẳng vào Storage với `Content-Type: image/svg+xml` và đuôi `.svg`.

Khi publish, `publish-facebook` chạy filter (đã có sẵn):
```ts
const isSvg = (u) => /\.svg(\?|$)/i.test(u) || u.startsWith('data:image/svg');
// → "[FB] Đã loại 1 ảnh SVG. Còn lại: 0"
```
→ Bài lên Facebook không có ảnh nào. (Logs đã in đúng: `[FB] Đã loại 1 ảnh SVG ... Còn lại: 0`).

Bug này ảnh hưởng cả Facebook, Instagram, Pinterest, LinkedIn, X, Threads, GBP — bất cứ kênh nào không nhận SVG đều mất ảnh khi pipeline có bước overlay text.

---

### Giải pháp: Rasterize SVG → PNG ngay trong `overlay-text-canvas`

Dùng `@resvg/resvg-wasm` (chạy được trên Deno edge) để convert SVG bytes do Satori sinh ra sang PNG, rồi upload PNG. Đây là pattern chuẩn Satori + Resvg, giữ nguyên toàn bộ logic layout/typography hiện tại.

#### Thay đổi cụ thể

**1. `supabase/functions/overlay-text-canvas/index.ts`**
- Import `@resvg/resvg-wasm` (esm.sh) + init WASM 1 lần (cache module-level).
- Thêm helper `rasterizeSvgToPng(svgString, width, height): Promise<Uint8Array>`.
- Sửa hàm `uploadToStorage` (≈ line 599) và 3 call sites khác (line 1572, 2048, 2163):
  - Đổi filename suffix: `${channel}-with-text-${ts}.png`
  - Đổi blob type: `image/png`
  - Đổi `contentType: 'image/png'`
  - Truyền PNG bytes (kết quả rasterize) thay vì SVG bytes.
- Bỏ data-URL fallback `data:image/svg+xml;base64,…` → đổi thành `data:image/png;base64,…` (sau rasterize).
- Update các response field `format: 'svg'` → `format: 'png'` (cho client biết).
- Fallback: nếu rasterize lỗi → log warn và **vẫn return PNG bytes rỗng → fail rõ ràng** thay vì âm thầm trả SVG (tránh tái diễn bug).

**2. `supabase/functions/publish-facebook/index.ts`**
- Giữ nguyên SVG filter (defense in depth).
- Thêm log warn rõ hơn khi sau filter `mediaUrls = 0`: `"Tất cả ảnh là SVG → publish không kèm ảnh. Kiểm tra overlay-text-canvas."` (giúp debug nhanh nếu tái diễn).

**3. Backfill ảnh SVG cũ (optional, không bắt buộc)**
- Bài hiện tại (`09c5a171-…`) đã publish FB không ảnh — không sửa được retroactive vì FB post đã đăng.
- Với các bài *chưa publish* nhưng `channel_images` đang trỏ `.svg`: lần publish kế tiếp nếu chạy lại generate-image sẽ tự ghi đè PNG mới. Không cần migration.

---

### Technical notes

- `@resvg/resvg-wasm` dùng được trên Deno: `import { Resvg, initWasm } from "https://esm.sh/@resvg/resvg-wasm@2.6.2"`. Phải `initWasm(fetch(wasmUrl))` 1 lần.
- Performance: rasterize 1080×1080 SVG ≈ 200–400ms, chấp nhận được trong edge function timeout.
- Memory: Resvg WASM ≈ 2MB; chạy trong cùng isolate Satori đã chạy nên ổn.
- Không đổi schema, không đổi RLS, không đổi client.

### Files thay đổi
- `supabase/functions/overlay-text-canvas/index.ts` (chính)
- `supabase/functions/publish-facebook/index.ts` (log only)

### Test
- Sau deploy: tạo 1 bài multichannel mới có FB → check `channel_images.facebook.url` đuôi `.png` → publish thử → log `[FB] Đã loại 0 ảnh SVG` và post FB có ảnh.