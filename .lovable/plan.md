
# Kế hoạch: Hợp nhất Hệ thống Tạo ảnh AI

## Mục tiêu
Gộp hai nút "Tạo ảnh AI" (sử dụng `generate-brand-image`) và "Ảnh" (sử dụng `generate-social-image`) thành **một hệ thống duy nhất**, kế thừa các ưu điểm của cả hai:

| Tính năng | Hiện tại "Ảnh" | Hiện tại "Tạo ảnh AI" | Sau hợp nhất |
|-----------|----------------|----------------------|--------------|
| Brand Context (colors, persona, industry) | Không | Có | Có |
| Style Presets (photorealistic, illustration...) | Không | Có | Có |
| Chỉnh sửa prompt trực tiếp | Có | Không | Có |
| Logo overlay | Không | Có | Có |
| Batch generate nhiều channels | Không | Có | Có |
| Xem lại prompt đã dùng | Có | Không | Có |

---

## Phạm vi thay đổi

### 1. Loại bỏ Edge Function thừa
- **Xóa**: `supabase/functions/generate-social-image/`
- **Giữ**: `supabase/functions/generate-brand-image/` (đã có đầy đủ tính năng)

### 2. Nâng cấp ImagePromptEditor
**File**: `src/components/ImagePromptEditor.tsx`

Cập nhật component để:
- Gọi `generate-brand-image` thay vì `generate-social-image`
- Thêm selector **Style Presets** (photorealistic, illustration, minimalist...)
- Thêm selector **Aspect Ratio** với channel-optimized defaults
- Thêm input **Negative Prompt** (các yếu tố cần tránh)
- Hiển thị **Brand Context Preview** (màu sắc, industry, persona)
- Cho phép bật/tắt **Logo Overlay** nếu brand có logo

### 3. Cập nhật Hook useSocialImageGeneration
**File**: `src/hooks/useSocialImageGeneration.ts`

- Thay đổi gọi từ `generate-social-image` sang `generate-brand-image`
- Thêm params: `brandTemplateId`, `imageStylePreset`, `negativePrompt`, `includeLogo`
- Trả về thêm `prompt` và `aspectRatio` trong response

### 4. Cập nhật MultiChannelViewer
**File**: `src/components/MultiChannelViewer.tsx`

- Truyền `brandTemplateId` vào `ImagePromptEditor`
- Truyền các brand context (logo, primary color, brand name)

### 5. Tích hợp UI thống nhất
**Luồng mới cho nút "Ảnh" trong content area**:

```text
┌─────────────────────────────────────────────────────────────────┐
│  Tạo ảnh cho [Channel]                                          │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────────┐  ┌──────────────────┐                     │
│  │ Brand Preview    │  │ Style: [Dropdown]│                     │
│  │ 🎨 #6366f1       │  │ □ photorealistic │                     │
│  │ Industry: Tech   │  │ □ illustration   │                     │
│  └──────────────────┘  │ □ minimalist ... │                     │
│                        └──────────────────┘                     │
│                                                                 │
│  Aspect Ratio: [1:1 ▼] (optimal cho Instagram)                  │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ AI Generated Prompt (có thể chỉnh sửa):                  │   │
│  │ Create a professional image for BrandXYZ...              │   │
│  │ ...                                                      │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Negative Prompt: [                                       ]     │
│                                                                 │
│  ☑️ Thêm logo thương hiệu  [Góc dưới phải ▼]                    │
│                                                                 │
│  [Đóng]                                          [🪄 Tạo ảnh]   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Chi tiết kỹ thuật

### Backend Changes

**Xóa file**: `supabase/functions/generate-social-image/index.ts`

Không cần sửa `generate-brand-image` vì đã có đầy đủ tính năng cần thiết.

### Frontend Changes

**1. src/hooks/useSocialImageGeneration.ts**
```typescript
interface GenerateImageParams {
  prompt: string;
  contentId?: string;
  channel?: Channel;
  aspectRatio?: string;
  organizationId?: string;
  // NEW params
  brandTemplateId: string;        // Required
  imageStylePreset?: ImageStylePreset;
  negativePrompt?: string;
  includeLogo?: boolean;
  logoPosition?: LogoPosition;
  logoUrl?: string;
}
```

Thay đổi function call:
```typescript
// Before
await supabase.functions.invoke('generate-social-image', {...})

// After
await supabase.functions.invoke('generate-brand-image', {
  body: {
    contentId,
    channel,
    contentSummary: prompt, // Prompt becomes contentSummary
    brandTemplateId,
    aspectRatio,
    imageStylePreset,
    negativePrompt,
  }
})
```

**2. src/components/ImagePromptEditor.tsx**

Thêm props mới:
```typescript
interface ImagePromptEditorProps {
  // ...existing
  brandTemplateId: string;  // NEW - required
  brandLogoUrl?: string;    // NEW
  brandIndustry?: string[]; // NEW
}
```

Thêm state cho các tính năng mới:
```typescript
const [imageStyle, setImageStyle] = useState<ImageStylePreset | 'auto'>('auto');
const [negativePrompt, setNegativePrompt] = useState('');
const [includeLogo, setIncludeLogo] = useState(!!brandLogoUrl);
const [logoPosition, setLogoPosition] = useState<LogoPosition>('bottom-right');
```

Thêm UI elements:
- Style preset dropdown (từ `IMAGE_STYLE_PRESETS`)
- Negative prompt textarea
- Logo toggle và position selector

**3. src/components/MultiChannelViewer.tsx**

Cập nhật nơi gọi `ImagePromptEditor`:
```typescript
<ImagePromptEditor
  // ...existing props
  brandTemplateId={content.brand_template_id}
  brandLogoUrl={brandLogoUrl}
  brandIndustry={brandTemplate?.industry}
/>
```

---

## Các bước thực hiện

1. **Xóa** `supabase/functions/generate-social-image/` và cập nhật config.toml
2. **Cập nhật** `useSocialImageGeneration.ts` để gọi `generate-brand-image`
3. **Nâng cấp** `ImagePromptEditor.tsx` với các tính năng mới
4. **Cập nhật** `MultiChannelViewer.tsx` để truyền brand context
5. **Test** end-to-end để đảm bảo tương thích

---

## Kết quả mong đợi

- **Một entry point duy nhất** cho tất cả tạo ảnh AI
- **Chất lượng tốt hơn** vì luôn có brand context
- **Linh hoạt hơn** với style presets và prompt editing
- **Code gọn hơn** - loại bỏ edge function trùng lặp
- **UX nhất quán** - người dùng không cần phân biệt hai nút
