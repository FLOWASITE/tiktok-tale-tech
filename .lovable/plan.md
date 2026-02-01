
# Full Migration: Thay thế AutoImageGenerator và ImagePromptEditor bằng UnifiedImageGenerator

## Tổng quan

Migration này sẽ thay thế hoàn toàn 2 component cũ:
- **AutoImageGenerator** (Batch mode - tạo ảnh cho nhiều kênh)
- **ImagePromptEditor** (Single mode - tạo ảnh từng kênh)

...bằng **UnifiedImageGenerator** đã được xây dựng với cả 2 mode trong một component duy nhất.

## Phân tích hiện trạng

### Files liên quan:

| File | Vai trò |
|------|---------|
| `src/components/MultiChannelViewer.tsx` | Entry point chính - sử dụng cả 2 component cũ |
| `src/components/multichannel/AutoImageGenerator.tsx` | Component batch cũ (525 dòng) |
| `src/components/ImagePromptEditor.tsx` | Component single cũ (537 dòng) |
| `src/components/multichannel/UnifiedImageGenerator.tsx` | Component mới hợp nhất (778 dòng) |

### Usage trong MultiChannelViewer:

1. **AutoImageGenerator**: Được gọi qua button "Tạo ảnh AI" ở toolbar (line 903)
   ```tsx
   <AutoImageGenerator
     open={showAutoImageGenerator}
     onOpenChange={setShowAutoImageGenerator}
     content={content}
     brandLogoUrl={brandLogoUrl}
     brandPrimaryColor={content.primary_color}
     onImageGenerated={...}
   />
   ```

2. **ImagePromptEditor**: Được gọi khi user click "Ảnh" button trên từng channel (lines 1270, 1426)
   ```tsx
   <ImagePromptEditor
     open={imageEditorOpen}
     onOpenChange={setImageEditorOpen}
     channel={imageEditorChannel}
     contentId={content.id}
     contentSummary={content.topic}
     brandName={content.brand_name}
     brandGuideline={content.brand_guideline}
     primaryColor={content.primary_color}
     brandTemplateId={content.brand_template_id}
     brandLogoUrl={brandLogoUrl}
     brandIndustry={industryMemory?.code ? [industryMemory.code] : undefined}
     onImageGenerated={(imageUrl) => {...}}
   />
   ```

## Kế hoạch thực hiện

### Task 1: Cập nhật UnifiedImageGenerator interface
**File**: `src/components/multichannel/UnifiedImageGenerator.tsx`

Cần bổ sung interface để handle callback khác nhau cho batch vs single:
- Batch mode: `onImageGenerated?: (channel: Channel, image: ChannelImage) => Promise<void>`
- Single mode: `onSingleImageGenerated?: (imageUrl: string) => void`

Hoặc sử dụng cùng một callback nhưng xử lý khác trong component.

### Task 2: Cập nhật MultiChannelViewer
**File**: `src/components/MultiChannelViewer.tsx`

**2.1 Thay đổi imports:**
```tsx
// Xóa
import { AutoImageGenerator } from '@/components/multichannel/AutoImageGenerator';
import { ImagePromptEditor } from '@/components/ImagePromptEditor';

// Thêm
import { UnifiedImageGenerator } from '@/components/multichannel/UnifiedImageGenerator';
```

**2.2 Gộp state management:**
- Giữ `showAutoImageGenerator` làm state chính để mở dialog
- Sử dụng `imageEditorChannel` để xác định mode:
  - `null` → Batch mode
  - `Channel` → Single mode cho channel đó

**2.3 Thay thế cả 2 component:**
```tsx
<UnifiedImageGenerator
  open={showAutoImageGenerator || imageEditorOpen}
  onOpenChange={(open) => {
    setShowAutoImageGenerator(open);
    setImageEditorOpen(open);
    if (!open) setImageEditorChannel(null);
  }}
  content={content}
  brandLogoUrl={brandLogoUrl}
  brandPrimaryColor={content.primary_color}
  brandIndustry={industryMemory?.code ? [industryMemory.code] : undefined}
  initialChannel={imageEditorChannel || undefined}
  initialMode={imageEditorChannel ? 'single' : 'batch'}
  onImageGenerated={onSaveChannelImage ? async (channel, image) => {
    // Update local state for immediate feedback
    setGeneratedImages(prev => ({ ...prev, [channel]: image.url }));
    // Save to database
    await onSaveChannelImage(content.id, channel, image);
  } : undefined}
/>
```

**2.4 Cập nhật button triggers:**
- Batch button (toolbar): `setShowAutoImageGenerator(true)` - giữ nguyên
- Single button (per channel): Đổi từ `setImageEditorOpen(true)` sang `setShowAutoImageGenerator(true)` + `setImageEditorChannel(channel)`

### Task 3: Xóa files không còn sử dụng
- `src/components/multichannel/AutoImageGenerator.tsx` (525 lines)
- `src/components/ImagePromptEditor.tsx` (537 lines)

## Chi tiết kỹ thuật

### Mapping props giữa cũ và mới:

| ImagePromptEditor (cũ) | UnifiedImageGenerator (mới) |
|------------------------|------------------------------|
| `channel` | `initialChannel` |
| `contentId` | `content.id` (từ content object) |
| `contentSummary` | Tự tính từ `content` |
| `brandName` | `content.brand_name` |
| `brandGuideline` | Không cần (đã có trong content) |
| `primaryColor` | `brandPrimaryColor` |
| `brandTemplateId` | `content.brand_template_id` |
| `brandLogoUrl` | `brandLogoUrl` |
| `brandIndustry` | `brandIndustry` |
| `onImageGenerated(url)` | `onImageGenerated(channel, image)` |

| AutoImageGenerator (cũ) | UnifiedImageGenerator (mới) |
|-------------------------|------------------------------|
| `content` | `content` ✓ |
| `brandLogoUrl` | `brandLogoUrl` ✓ |
| `brandPrimaryColor` | `brandPrimaryColor` ✓ |
| `onImageGenerated` | `onImageGenerated` ✓ |
| N/A | `brandIndustry` (mới) |
| N/A | `initialChannel` (mới) |
| N/A | `initialMode` (mới) |

### State simplification trong MultiChannelViewer:

```tsx
// Trước migration - 2 bộ state riêng biệt
const [showAutoImageGenerator, setShowAutoImageGenerator] = useState(false);
const [imageEditorOpen, setImageEditorOpen] = useState(false);
const [imageEditorChannel, setImageEditorChannel] = useState<Channel | null>(null);

// Sau migration - gộp thành 2 state
const [showImageGenerator, setShowImageGenerator] = useState(false);
const [activeImageChannel, setActiveImageChannel] = useState<Channel | null>(null);
```

### Button click handlers:

```tsx
// Batch mode trigger (toolbar)
onClick={() => {
  setActiveImageChannel(null);
  setShowImageGenerator(true);
}}

// Single mode trigger (per channel)
onClick={() => {
  setActiveImageChannel(channel);
  setShowImageGenerator(true);
}}
```

## Kết quả đạt được

1. **Giảm ~1000 dòng code** - Loại bỏ 2 files legacy
2. **Single entry point** - Chỉ còn 1 component cho mọi image generation
3. **Consistent UX** - Cùng controls (style presets, aspect ratio, logo overlay) cho cả batch và single
4. **Shared configuration** - Sử dụng `CHANNEL_IMAGE_CONFIG` từ shared config
5. **Better maintainability** - Chỉ cần update 1 nơi khi có thay đổi logic

## Rủi ro và xử lý

| Rủi ro | Giải pháp |
|--------|-----------|
| Single mode callback khác với ImagePromptEditor cũ | UnifiedImageGenerator đã có cùng signature `onImageGenerated(channel, image)` |
| State cleanup khi đóng dialog | Thêm logic reset `activeImageChannel` về null khi `onOpenChange(false)` |
| Breaking existing workflows | Test kỹ cả 2 flows: batch và single channel |
