# Tối ưu ảnh Pinterest cho mockup Pinterest (2:3 vertical)

## Triệu chứng
Mockup Pinterest hiển thị khung dọc tỉ lệ 2:3 (`aspect-[2/3]`) nhưng ảnh do pipeline tạo ra **không phải 2:3**, dẫn đến ảnh bị crop / co kéo / hiện sai khung trong card Pinterest.

## Nguyên nhân (chính xác)
Trong `src/hooks/useAutoImageGeneration.ts` — hook batch dùng cho nút "Tạo ảnh" trên trang `/multichannel`:

```ts
export type AspectRatioOption = '16:9' | '1:1' | '9:16' | '4:5' | 'auto';

const getAspectRatioForChannel = (channel, aspectRatio): '16:9' | '1:1' | '9:16' | '4:5' => {
  if (aspectRatio === 'auto') {
    const optimal = CHANNEL_OPTIMAL_ASPECT_RATIO[channel];     // 'pinterest' → '2:3'
    if (optimal === '16:9' || optimal === '1:1' || optimal === '9:16' || optimal === '4:5') {
      return optimal;
    }
    return '16:9';   // ⚠️ Pinterest rơi vào đây → ảnh thành landscape 16:9
  }
  return aspectRatio;
};
```

Whitelist không có `'2:3'`, nên Pinterest fallback sang `16:9`. Edge function `generate-brand-image` + Poyo/Kie/GeminiGen đều **đã hỗ trợ `2:3`** (đã verify trong `_shared/poyo-image-generator.ts`, `kie-image-generator.ts`, `geminigen-image-generator.ts`), tức backend không phải vấn đề. `useSocialImageGeneration` (hook regenerate đơn) đã đúng — chỉ batch hook bị.

Đây cũng vi phạm rule trong memory **Pinterest Native Spec**: Pinterest 2:3 1000×1500 vertical.

## Kế hoạch sửa (chỉ frontend)

### 1. `src/hooks/useAutoImageGeneration.ts`
- Mở rộng `AspectRatioOption` thêm `'2:3'`:
  ```ts
  export type AspectRatioOption = '16:9' | '1:1' | '9:16' | '4:5' | '2:3' | 'auto';
  ```
- Cập nhật `getAspectRatioForChannel` whitelist + return type bao gồm `'2:3'`.
- Default `aspectRatio = '16:9'` ở dòng 226 giữ nguyên (chỉ là fallback khi không 'auto').

### 2. Verify các nơi khác cũng nhận `'2:3'`
Kiểm tra (read-only) các điểm sau và mở rộng type/union nếu cần:
- `src/types/multichannel.ts` (nếu có `AspectRatio` chung).
- `supabase/functions/generate-brand-image/index.ts` line 40 input type — chỉ là TS type trong edge function, runtime không validate strict, nhưng nên thêm `'2:3'` cho rõ và tránh cảnh báo type khi gọi.
- `ASPECT_RATIO_OPTIONS` trong `src/config/channelImageConfig.ts`: thêm option `{ value: '2:3', label: '2:3 (Pinterest Pin)', description: 'Pinterest' }` để user có thể chọn thủ công nếu muốn.

### 3. Verify
- Mở `/multichannel` → chọn 1 content có channel Pinterest → bấm "Tạo ảnh".
- Kiểm tra console log `[Pipeline:pinterest] aspect ratio` truyền vào edge function = `2:3`.
- Edge function `generate-brand-image` log: `aspectRatio=2:3`, Poyo size = 1000×1500.
- Mở mockup Pinterest tab → ảnh hiển thị đầy khung 2:3 không bị cắt mép, đúng spec native Pinterest.

## Files dự kiến chạm
- `src/hooks/useAutoImageGeneration.ts` (mở rộng type + whitelist).
- `src/config/channelImageConfig.ts` (thêm `'2:3'` vào `ASPECT_RATIO_OPTIONS`).
- `supabase/functions/generate-brand-image/index.ts` (mở rộng TS type input — không đổi logic).

Không đụng tới mockup, prompt builder, hay UI khác — chỉ sửa đường ống tỉ lệ ảnh để đến đúng `2:3` cho Pinterest.
