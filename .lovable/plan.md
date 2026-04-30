# Plan: Social Format Picker cho Video Scripts

## Mục tiêu
Thay vì để user chọn duration trừu tượng (60/90/120/180s), thêm **Social Format Picker** ở bước tạo Video Script — chọn 1 chip "TikTok Short / Reels Standard / YouTube Long…" → tự động set `duration` + `aspect_ratio` + gợi ý tone phù hợp platform.

## Phạm vi
- Chỉ áp dụng cho `purpose = 'ai_video'` (Video Scripts)
- Không phá luồng cũ: vẫn cho user override duration thủ công nếu cần
- Picker mới đứng cạnh `ConfigChipSelector` hiện tại trong `ScriptFormStepper`

---

## 1. Data model — Preset Matrix

Tạo file mới `src/types/socialFormat.ts`:

```text
Platform       | Short  | Standard | Long
TikTok         | 15s    | 30s      | 60s    (9:16)
Reels (IG)     | 15s    | 30s      | 60s    (9:16)
YT Shorts      | 15s    | 30s      | 60s    (9:16)
Facebook       | 30s    | 60s      | 90s    (1:1 / 9:16)
LinkedIn       | 30s    | 60s      | 90s    (1:1)
YouTube Long   | 60s    | 180s     | 600s   (16:9)
```

Mỗi preset export shape:
```ts
{
  id: 'tiktok-short',
  platform: 'tiktok',
  format: 'short',
  label: 'TikTok Short',
  duration: 15,
  aspectRatio: '9:16',
  toneHint: 'punchy, hook-1.5s',
  channelKey: 'tiktok',  // map sang generate-video-prompt channel param
}
```

## 2. Mở rộng `Duration` type

File: `src/types/script.ts`
- Đổi `export type Duration = 60 | 90 | 120 | 180` → `export type Duration = 15 | 30 | 60 | 90 | 120 | 180 | 600`
- Bổ sung `DURATION_LABELS` cho 15/30/600
- Thêm `aspect_ratio?: '9:16' | '16:9' | '1:1'` vào `ScriptFormData` interface (line 124, 178)

## 3. Component mới — `SocialFormatPicker`

File: `src/components/script/SocialFormatPicker.tsx`
- 2-step UI: chọn Platform (icons SVG `ChannelIcon`, không emoji) → chọn Format (Short/Standard/Long) dạng segmented control
- Soft Luxury: neutral gray border, `bg-foreground/[0.03]` khi active
- Props: `value`, `onChange(preset)`, `disabled`
- Khi chọn → call `onChange` trả về full preset object để parent set cả duration + aspect_ratio

## 4. Tích hợp vào `ScriptFormStepper.tsx`

Tại block "Cấu hình" (line 608-629):
- Thêm chip mới **Social Format** đứng TRƯỚC chip Duration
- Chỉ hiển thị khi `formData.purpose === 'ai_video'`
- Khi user chọn preset → setFormData cả `duration`, `aspect_ratio`, lưu `socialFormatId` vào state để hiện active state
- Chip Duration giữ nguyên làm "Override" (chip phụ, hiển thị nhỏ hơn) cho power user

## 5. Cập nhật `DurationSelector.tsx`

- Mở rộng `DURATION_CONFIG` thêm 15/30/600
- Sửa `description` chính xác hơn (bỏ chung chung "TikTok/Reels"):
  - 15s → "Hook ngắn"
  - 30s → "Quảng cáo"
  - 60s → "Standard"
  - 90s/120s/180s → "Long-form"
  - 600s → "YouTube dài"
- Layout `grid-cols-3` thay vì `grid-cols-2` để chứa 7 options gọn hơn

## 6. Truyền aspect_ratio xuống pipeline

- `useScripts.ts` (hook tạo script): include `aspect_ratio` vào payload gửi `generate-script` edge function
- Khi script chuyển sang Video Studio (qua `ScriptToVideoContext`), nạp `aspect_ratio` vào `QuickClip` mặc định → user không phải chọn lại ở studio
- `generate-video-prompt` đã nhận `aspect_ratio` + `channel` sẵn — chỉ cần caller truyền đúng

## 7. UX micro-detail

- Khi đổi preset, animate chip Duration update giá trị mới (smooth transition)
- Tooltip trên mỗi platform card: "TikTok: vertical 9:16, hook 1.5s đầu, max 60s/clip"
- Cảnh báo nhỏ khi chọn duration > 60s: "Sẽ chia thành N scenes × 10s do giới hạn AI video model"

---

## Files thay đổi

**Tạo mới:**
- `src/types/socialFormat.ts` — preset matrix + types
- `src/components/script/SocialFormatPicker.tsx` — UI picker

**Sửa:**
- `src/types/script.ts` — mở rộng `Duration` type, thêm `aspect_ratio` vào `ScriptFormData`
- `src/components/script/DurationSelector.tsx` — thêm 15/30/600s, sửa description
- `src/components/script/ScriptFormStepper.tsx` — chèn `SocialFormatPicker` chip
- `src/hooks/useScripts.ts` — truyền `aspect_ratio` xuống edge function
- `src/contexts/ScriptToVideoContext.tsx` — propagate aspect_ratio sang Studio

**Memory cập nhật:**
- Thêm entry `mem://features/video/social-format-presets-vn` vào index — preset matrix Platform×Format mapping duration+aspect

---

## Out of scope (đề xuất giai đoạn sau)
- Auto-recommend preset dựa trên Brand audience / Industry pack
- Thumbnail preview theo aspect ratio
- Quota check riêng cho long-form (600s tốn nhiều scene)