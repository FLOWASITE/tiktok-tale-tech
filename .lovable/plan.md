

## Cải thiện 3 Mode kiểm soát AI — Prompt Engineering + Channel-adaptive Layout + Prompt Preview

Dựa trên phân tích chuyên gia, triển khai 3 thay đổi có impact cao nhất.

---

### Thay đổi 1: Sửa prompt engineering cho cả 3 mode

**File:** `supabase/functions/_shared/image-prompt-builders.ts`

**1a. Mode `full` — Bỏ "FULL CREATIVE FREEDOM", thay bằng "GUIDED CREATIVE"**

Trong `buildCreativeMode` (line 57-67), thay:
```
"You have FULL CREATIVE FREEDOM to interpret and enhance..."
```
Bằng:
```
"Create a visually compelling image optimized for {channel}.
 Required constraints: brand colors, channel composition, target audience.
 Creative latitude: lighting, subject posing, background elements, color harmony beyond brand palette."
```
Rõ ràng đâu là constraint, đâu là tự do — không còn mâu thuẫn.

**1b. Mode `brand_only` — Thêm lại channel optimization**

Trong `buildCreativeMode` (line 42-53), thay "LITERALLY" bằng:
```
"Follow user description closely for subject and scene.
 Optimize composition and framing for {channel} ({aspectRatio}).
 Apply brand colors as accents."
```

Đồng thời sửa `buildChannelSpec` (line 101) — hiện tại skip hoàn toàn cho `brand_only`. Đổi thành chỉ skip cho `raw`, cho `brand_only` inject channel spec nhẹ (aspect ratio + composition hints only, không inject mood/style).

**1c. Mode `raw` — Thêm minimal channel awareness**

Trong `buildCreativeMode` (line 27-39), thêm 1 dòng:
```
"Ensure output has clean composition suitable for {channel} usage."
```
Không inject brand, chỉ đảm bảo ảnh usable cho kênh đích.

---

### Thay đổi 2: Channel-specific text layout thay vì 1 template cứng

**File:** `supabase/functions/_shared/image-prompt-builders.ts`

Trong `buildTextLayout` (line 188-309), hiện tại `buildStructuredLayoutContent()` áp dụng cùng 1 layout 3-phần cho mọi kênh. Thay đổi:

Thêm `CHANNEL_TEXT_LAYOUTS` map:
```typescript
const CHANNEL_TEXT_LAYOUTS: Partial<Record<Channel, string>> = {
  tiktok: 'Vertical storytelling: Bold text top 20%, face/product center 60%, subtle CTA bottom. Leave bottom 20% clear for captions.',
  instagram: 'Visual-first: Minimal text (2-3 words max) overlaid. Image is the star, text is accent.',
  youtube: 'Thumbnail style: Expressive face left 40%, bold 3-5 word text right 60%. High contrast.',
  linkedin: 'Professional: Insight headline top, clean visual center, subtle branding bottom.',
  email: 'Hero banner: Single centered message, clean background, CTA button below.',
};
```

Nếu kênh có layout riêng → dùng layout đó thay vì structured 3-phần. Fallback về structured 3-phần cho các kênh còn lại (facebook, website, zalo, etc.).

---

### Thay đổi 3: Prompt Preview UI

**File mới:** `src/components/multichannel/PromptPreview.tsx`

Component hiển thị tóm tắt readable trước khi generate:
- Kênh + aspect ratio
- Style đang chọn
- Brand color (dominant/accent/none tùy mode)
- Đối tượng (nếu có persona)
- Mục tiêu content (role + angle)
- Hook type
- Text overlay (có/không + layout type)
- Country targeting

Hiển thị dạng card nhỏ gọn, collapsible, đặt ngay trên nút "Tạo ảnh" trong cả `SimpleImageGenerator` và `MultiChannelFormWizard`. Không bắt buộc xem — collapsed by default, user mở nếu muốn.

**Files cần sửa để tích hợp:**
- `src/components/multichannel/SimpleImageGenerator.tsx` — thêm PromptPreview vào Step 3
- `src/components/multichannel/MultiChannelFormWizard.tsx` — thêm vào Step 6

---

### Tóm tắt phạm vi

| # | Thay đổi | File | Ước lượng |
|---|----------|------|-----------|
| 1a | Sửa prompt mode full | `image-prompt-builders.ts` | ~10 dòng |
| 1b | Thêm channel opt cho brand_only | `image-prompt-builders.ts` | ~20 dòng |
| 1c | Thêm channel awareness cho raw | `image-prompt-builders.ts` | ~3 dòng |
| 2 | Channel-specific text layout | `image-prompt-builders.ts` | ~40 dòng |
| 3 | Prompt Preview component | `PromptPreview.tsx` + 2 files tích hợp | ~150 dòng |

Tổng: ~220 dòng thay đổi, 1 file mới, 3 files sửa. Không breaking change — prompt output cải thiện, UI bổ sung optional.

