

# Tăng cường hiển thị màu Brand trong ảnh AI

## Nguyên nhân gốc
Prompt hiện tại dùng ngôn ngữ yếu cho brand colors ("accent color", "incorporate"), và DB design tokens có thể ghi đè bằng màu mặc định (xanh/đen). AI ưu tiên tokens hơn brand colors → kết quả thiếu màu thương hiệu.

## Giải pháp

### 1. `supabase/functions/generate-carousel-image/index.ts` — Tăng cường brandColorDirective

**Line 960-973**: Viết lại directive mạnh hơn:
- Thay "incorporate as dominant colors" → "These are the PRIMARY colors — they MUST dominate the image"
- Thêm chỉ dẫn cụ thể: "At least 40-60% of the image's color area must use these brand colors"
- Thêm negative: "Do NOT default to blue, black, or generic corporate colors unless they ARE the brand colors"

**Line 1126-1148**: Đưa brandColorDirective lên VỊ TRÍ ĐẦU TIÊN trong prompt assembly (trước scene description) vì AI ưu tiên thông tin đầu prompt.

**Line 975-999**: Khi có brandColors, ép DB tokens phải nhường — chỉ giữ `mood`, `effects`, loại bỏ các `colors.primary`, `colors.accent` từ tokens để tránh conflict.

### 2. `supabase/functions/_shared/image-prompt-builders.ts` — Tăng sức ép trong full mode

**Line 161-170**: Viết lại phần COLOR PALETTE:
- "PRIMARY COLOR: {hex} — This MUST be the dominant color in the image (40-60% color area)"
- Thêm: "FORBIDDEN: Do not use blue (#3B82F6), teal, or generic dark themes unless they match the brand palette above"
- Sandwich technique: lặp lại brand colors ở cuối prompt (suffix position)

### 3. `supabase/functions/_shared/image-prompt-builders.ts` — Thêm Brand Color Reinforcement builder (suffix)

Thêm builder mới `buildBrandColorReinforcement` ở position `suffix` để nhắc lại brand colors ở cuối prompt (sandwich technique — AI nhớ đầu và cuối prompt rõ nhất).

## Tóm tắt
- Sửa 2 file
- `generate-carousel-image/index.ts`: Tăng cường directive + đổi vị trí trong prompt + lọc token conflict
- `image-prompt-builders.ts`: Viết lại color section mạnh hơn + thêm suffix reinforcement builder

