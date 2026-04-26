
## 🔍 Phân tích nguyên nhân

Logs `overlay-logo-canvas` (15 phút gần nhất) **không có boot/execution event nào** — chỉ shutdown. Nghĩa là frontend **không hề gọi** function overlay logo. Có 3 khả năng theo thứ tự ưu tiên:

### Nguyên nhân #1 (nhiều khả năng nhất): `logoUrl` rỗng khi đẩy xuống pipeline
Trong `useAutoImageGeneration.ts:468`:
```ts
if (includeLogo && logoUrl) {  // ← bị skip nếu logoUrl undefined
  await invokeWithTimeout('overlay-logo-canvas', ...)
}
```
Nhánh `else` chỉ log "STEP 2 SKIPPED — no logo configured" rồi bỏ qua **không cảnh báo người dùng**.

→ Nếu `brandLogoUrl` không được truyền chính xác từ `UnifiedImageGenerator.tsx` / `SimpleImageGenerator.tsx` xuống hook (vd: brand chưa load xong, race condition khi user bấm Generate), logo sẽ bị skip âm thầm.

### Nguyên nhân #2: AI render mode đang "đốt" logo
Khi `useCanvasFallback=false`, hệ thống đang nhờ AI vẽ logo trong prompt thay vì overlay canvas. Gemini thường **bỏ qua hoặc vẽ sai** logo từ prompt mô tả → user thấy "không có logo".

### Nguyên nhân #3: Carousel dùng path khác
Carousel gọi `branded-image-composer.ts` chứ không dùng `overlay-logo-canvas`. Cần kiểm tra riêng.

---

## 🛠️ Kế hoạch sửa (3 lớp)

### Lớp 1 — Hard guard + chẩn đoán hiện tại (5 phút)
**File:** `src/hooks/useAutoImageGeneration.ts`
- Thêm `console.error` + toast cảnh báo rõ ràng khi `includeLogo=true` nhưng `logoUrl` rỗng:
  > "Đã bật logo nhưng brand chưa có logo URL — vui lòng upload logo trong trang Brand"
- Log đầy đủ `{ includeLogo, logoUrl, brandTemplateId }` ở entry point của hook để dễ debug session sau.

**File:** `src/components/multichannel/UnifiedImageGenerator.tsx` & `SimpleImageGenerator.tsx`
- Disable toggle "Thêm logo" + show tooltip "Brand chưa có logo" khi `brandLogoUrl` falsy, thay vì cho bật rồi fail âm thầm.

### Lớp 2 — Force canvas overlay làm mặc định khi có logo (10 phút)
**File:** `src/hooks/useAutoImageGeneration.ts` + `useAutoImagePipeline.ts`
- Khi `includeLogo && logoUrl`, **luôn ép** route qua `overlay-logo-canvas` (canvas overlay deterministic) thay vì để AI tự render. Nano-banana không bám prompt logo tốt.
- Bỏ điều kiện cho phép AI render logo trong prompt (hoặc đặt `useCanvasFallback=true` mặc định cho mọi channel khi có logo).

### Lớp 3 — Sửa carousel + brand sample (10 phút)
**File:** `supabase/functions/_shared/branded-image-composer.ts` + `generate-carousel-image/index.ts`
- Kiểm tra điều kiện skip logo trong composer (tương tự Lớp 1).
- Đảm bảo `logoUrl` được pass-through từ `generate-carousel` → `branded-image-composer`.
- Thêm log `[composer] logo: included|skipped (reason)` để future debug.

### Lớp 4 — Verify (5 phút)
- Deploy `overlay-logo-canvas` (no code change, chỉ ép boot fresh).
- Test trên 1 channel facebook — kiểm tra logs xuất hiện `[overlay-logo-canvas] PERF` line.

---

## 📋 Thứ tự thực hiện
1. Lớp 1 (hard guard) — fix 80% case "logo url rỗng"
2. Lớp 2 (force canvas) — fix 15% case "AI bỏ qua logo trong prompt"
3. Lớp 3 (carousel) — fix 5% case riêng
4. Lớp 4 (verify) — confirm end-to-end

Sau khi approve, tôi sẽ bắt đầu Lớp 1 trước để đảm bảo fix được nguyên nhân phổ biến nhất, sau đó tiếp các lớp khác.
