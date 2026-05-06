# Khắc phục: Video tạo ra khuôn mặt không giống nhân vật brand

## Chẩn đoán (từ log + code trace)

Log vừa rồi của `generate-video`:
```
provider=geminigen model=geminigen/veo-3.1-fast (admin=false) duration=5s aspect=9:16
```
- **Không có log `[generate-video] Injected N character(s)`** → request không mang `character_profile_ids` → server không inject character block, không build collage, không force Veo 3.1, không seed.
- Model dùng là **Veo 3.1 Fast** (auto-pick cho 9:16) — model fast giữ identity yếu hơn Veo 3.1 thường rất nhiều, đặc biệt khi không có ảnh ref.

Nguyên nhân gốc: cơ chế **auto-pin nhân vật brand** chỉ chạy đúng khi:
1. Brand hiện tại có 1 nhân vật `default_role = 'main'` gắn `brand_template_id`.
2. `MultiCharacterPicker` được mount với `value.length === 0`.

Nếu user chưa set vai chính cho brand (hoặc nhân vật không gắn brand) → picker rỗng → request không có character → server không khoá identity → mặt drift hoàn toàn.

Ngoài ra, ngay cả khi user **chọn thủ công** 1 nhân vật, code path single-char **không build collage** (đúng) nhưng vẫn dùng `Veo 3.1` (không phải Fast) — log hôm nay cho thấy không vào nhánh đó → confirm là KHÔNG có character.

## Thay đổi

### 1. Auto-pin mạnh hơn trong `MultiCharacterPicker.tsx`
Khi `value.length === 0` và brand có nhân vật gắn brand:
- **Ưu tiên 1:** nhân vật `default_role='main'` của brand (logic hiện tại).
- **Ưu tiên 2 (mới):** nếu không có `main`, pin nhân vật **đầu tiên** thuộc brand (kèm toast nhỏ: "Đã tự chọn <tên> để giữ khuôn mặt nhất quán. Bấm để đổi.").
- **Ưu tiên 3 (mới):** nếu brand chưa có nhân vật nào nhưng `profiles.length > 0` ở org → hiển thị banner inline "Brand chưa có nhân vật. Tạo/gắn nhân vật để giữ khuôn mặt nhất quán giữa các clip" + nút "Tạo nhân vật" mở `CharacterFormSheet` prefill `brand_template_id = currentBrand.id`.

### 2. Banner cảnh báo trong `QuickClipTab` + `StoryboardVideoTab`
Trước nút "Tạo clip", nếu `selectedCharacterIds.length === 0`:
- Banner amber, dismissible: "⚠️ Chưa chọn nhân vật → AI sẽ tự bịa khuôn mặt mỗi clip. Chọn nhân vật để khoá identity."
- Không block generate (user vẫn có thể tạo clip không cần nhân vật cho B-roll/sản phẩm).

### 3. Force Veo 3.1 (không Fast) khi có character — `generate-video/index.ts`
Hiện đã force `geminigen/veo-3.1` khi có `characterRefUrl`. Bổ sung:
- Force ngay khi `resolvedCharIds.length > 0` (kể cả khi server tạm thời chưa fetch được ref ảnh — vẫn dùng Veo 3.1 vì text prompt có character block).
- Thêm log rõ ràng: `[generate-video] Identity lock active: chars=N, refUrl=<...>, seed=<...>, model=veo-3.1`.

### 4. Tăng chất lượng auto-pick model cho 9:16 khi có character — `src/lib/videoModelCaps.ts` (hoặc nơi `autoPickModelForAspect`)
Hiện mặc định trả `veo-3.1-fast` cho 9:16 → dù request có character vẫn bị server force về `veo-3.1`. Thay đổi:
- Thêm tham số optional `hasCharacter: boolean` vào `autoPickModelForAspect`.
- Nếu `hasCharacter` → bỏ qua Fast, trả thẳng `geminigen/veo-3.1` để client-side cost estimate khớp với cái server thực sự dùng (tránh user thấy rẻ rồi bị charge cao).
- Update QuickClipTab + StoryboardVideoTab truyền `selectedCharacterIds.length > 0`.

### 5. Telemetry: client log payload trước khi gửi
Trong `useVideoGeneration.ts` thêm `console.log('[generate-video req]', { hasChars: ids.length, model, aspect })` để lần sau debug nhanh.

## Tiêu chí nghiệm thu
- Mở Studio → QuickClip với brand đã có nhân vật main → picker tự pin nhân vật + cost estimate hiện Veo 3.1 (không Fast).
- Brand chưa có nhân vật main nhưng có nhân vật → picker pin nhân vật đầu + toast hướng dẫn.
- Brand chưa có nhân vật nào → banner amber + CTA tạo nhân vật.
- Generate clip có character → log server: `Identity lock active: chars=1, refUrl=https://..., seed=<int>, model=geminigen/veo-3.1`.
- 3 clip cùng nhân vật → cùng seed → mặt giữ nguyên.

## Files chạm
- `src/components/video/MultiCharacterPicker.tsx`
- `src/components/video/QuickClipTab.tsx`
- `src/components/video/StoryboardVideoTab.tsx`
- `src/lib/videoModelCaps.ts`
- `src/hooks/useVideoGeneration.ts`
- `supabase/functions/generate-video/index.ts`
