# Fix: Video chỉ render 5s thay vì 15s

## Nguyên nhân (đã xác minh qua logs)

Edge function logs vừa rồi:
```
[generate-video] provider=geminigen model=geminigen/veo-3.1-fast 
                 duration=5s aspect=9:16
[geminigen-video] Submit: model=veo-3.1-fast, ratio=9:16, duration=5s
```

**3 vấn đề chồng nhau ở `QuickClipTab.tsx`:**

1. **Default duration cứng = 5s** (`useState(5)` line 38) — không đọc từ scene plan của script.
2. **Khi sync từ scene** (line 69): `Math.min(scene.duration, selectedModel.maxDuration)` — mà `selectedModel` đang là Veo 3.1 Fast với `maxDuration=8` → 15s bị clamp xuống 8s, rồi user kéo slider lại còn 5s.
3. **Model không auto-pick theo aspect** — luôn dùng admin default (`veo-3.1-fast` cap 8s) cho cả 9:16, trong khi `generate-script` đã chọn Seedance 2 (cap 15s) cho vertical.

→ Kết quả: script bảo "1 prompt 15s với Seedance 2", nhưng QuickClipTab gửi "5s với Veo 3.1 Fast".

## Sửa

### 1. `src/components/video/QuickClipTab.tsx`

- **Auto-pick model theo aspect** (giống logic `pickRecommendedVideoModel` ở `generate-script`):
  - 9:16 / 1:1 / 2:3 → `poyo/seedance-2` (cap 15s)
  - 16:9 → `geminigen/veo-3.1-fast` (cap 8s)
  - Admin default chỉ dùng làm fallback nếu auto-pick không có trong VIDEO_MODELS.
- **Default duration = 15s cho vertical, 8s cho 16:9** (thay vì cứng 5s).
- **Sync scene đúng duration**: bỏ clamp về `selectedModel.maxDuration` cũ — phải re-derive model trước, rồi clamp theo cap mới. Dùng `scene.duration ?? duration` không clamp giảm, chỉ clamp tăng.
- Slider `max` = `selectedModel.maxDuration` (đã đúng), nhưng khi đổi aspect → reset duration về cap mới.

### 2. `src/types/videoGeneration.ts`

`POYO_VIDEO_MODELS`: `seedance-2` đang để `maxDuration: 10` — sửa thành `15` (đồng bộ với `generate-script` và doc PoYo 4-15s).

### 3. `src/lib/videoModelCaps.ts`

Thêm entry `'poyo/seedance-2'` (hiện chỉ có `seedance-1-pro` cap 10s) với `maxDuration: 15, durationChoices: [5, 10, 15]` cho admin panel.

### 4. `src/components/video/ProviderModelPicker.tsx` (kiểm tra)

Đảm bảo `VIDEO_MODELS` có `poyo/seedance-2` với `maxDuration: 15` và `pricePerSec` đúng.

## Test sau khi sửa

1. Mở script TikTok 15s → click "Quay scene này" → QuickClipTab auto-fill: **Seedance 2 + 15s + 9:16**.
2. Bấm "Tạo video" → log phải show: `model=poyo/seedance-2 duration=15s aspect=9:16`.
3. Đổi aspect sang 16:9 → tự reset thành Veo 3.1 Fast + 8s.
4. Quick Clip rời (không từ script): default = Seedance 2 + 15s + 9:16.

## Không thay đổi

- Backend `generate-video` & `generate-script` — đã đúng logic, chỉ frontend gửi sai params.
- Admin AI config — vẫn áp dụng cho các flow khác (manual override, image, text).
