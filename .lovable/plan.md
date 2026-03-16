

## Phương án tối ưu Text cho hệ thống tạo ảnh Social

### Phân tích hiện trạng

Hệ thống xử lý text qua 3 lớp:
1. **`getBestOverlayText()`** — lấy text từ hook/content, cắt thô ≤100 ký tự
2. **`optimize-social-text`** — edge function dùng AI rút gọn text (user bấm nút thủ công)
3. **`decompose-image-request`** — AI phân tích nội dung → overlay elements (banner ≤30, hero ≤20, cards ≤50, description ≤60)

### Các vấn đề phát hiện

```text
Vấn đề                              Hệ quả
───────────────────────              ──────────────────────
1. optimize-social-text là thủ công  User phải bấm nút → hay quên → text dài tràn
2. Không có char limit trên UI       User nhập text 200+ chars, overlay bị tràn
3. decompose nhận text ≤3000 chars   Nhưng banner/hero/cards limits quá chặt 
   và AI tự cắt, không nhất quán     (banner 30, hero 20) → mất ý nghĩa
4. Card label cứng ≤50 chars         Tiếng Việt dài hơn tiếng Anh ~30%
5. Không có text fitting logic       Font size cố định → text dài bị tràn khỏi card
6. Không validate line-break          Text 1 dòng nhưng rất dài → không wrap đúng
7. Hero number circle chỉ match      "3 THAY ĐỔI" không match /^\d+$/ → miss
   regex số thuần
```

### Kế hoạch 5 nâng cấp

#### 1. Auto-optimize text trước khi gửi pipeline
**Files**: `SimpleImageGenerator.tsx`, `useAutoImageGeneration.ts`

- Tự động gọi `optimize-social-text` khi `textToInclude.length > 80` trước khi bắt đầu generation
- Không cần user bấm nút — tích hợp vào flow `handleGenerateImages`
- Giữ nút thủ công cho user muốn preview trước

#### 2. Smart text fitting trong overlay-text-canvas
**File**: `overlay-text-canvas/index.ts`

- Thêm hàm `fitTextToWidth(text, maxWidth, baseFontSize)` → auto-scale font size xuống khi text quá dài
- Áp dụng cho: banner (auto-shrink nếu >20 chars), cards (auto-shrink nếu label >30 chars), CTA
- Thêm `Math.max()` guard cho tất cả font sizes (min 10px cho description, 14px cho label, 16px cho banner)
- Card description font: `Math.max(cardDescFontSize, 12)` (đã identify từ đánh giá trước)

#### 3. Nâng cấp hero text matching
**File**: `overlay-text-canvas/index.ts`

- Mở rộng regex hero circle: `/^\d+$/` → `/^\d+(\.\d+)?[%+]?$/` để match "30%", "200+", "3.5"
- Thêm variant: hero text bắt đầu bằng số + text ngắn (VD: "3 THAY ĐỔI") → render số trong circle + text bên cạnh
- Logic: nếu `heroText` match `/^(\d+)\s+(.+)$/` → split thành circleNumber + sideLabel

#### 4. Tối ưu decompose AI prompt cho text quality
**File**: `decompose-image-request/index.ts`

- Nâng limit: banner 30→40 chars, card label 50→60 chars (tiếng Việt cần nhiều space hơn)
- Thêm quy tắc vào system prompt: "Ưu tiên giữ nguyên số liệu cụ thể, tên riêng. Chỉ rút gọn phần mô tả"
- Thêm instruction: "Hero text PHẢI là keyword/số liệu nổi bật nhất, KHÔNG phải câu dài"
- Thêm validation: nếu AI trả banner text >40 chars → auto-truncate thông minh (cắt tại word boundary)

#### 5. UI text counter + warning
**File**: `ImageAdvancedOptions.tsx`

- Thêm character counter dưới textarea "Text trên ảnh": `{textToInclude.length}/120`
- Hiển thị warning khi >120 chars: "Text dài có thể bị cắt trên ảnh"
- Thêm visual indicator (đỏ khi >150 chars)

### Files cần sửa

| File | Thay đổi |
|---|---|
| `supabase/functions/overlay-text-canvas/index.ts` | Text fitting, font min guards, hero number expanded matching |
| `supabase/functions/decompose-image-request/index.ts` | Nâng char limits, prompt quality rules |
| `src/components/multichannel/SimpleImageGenerator.tsx` | Auto-optimize trước generation |
| `src/components/multichannel/ImageAdvancedOptions.tsx` | Char counter + warning UI |

