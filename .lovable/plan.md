
# Kế hoạch: Thêm tính năng Background Editing (Xóa/Thay đổi nền)

## Mục tiêu
Cho phép người dùng chỉnh sửa background của ảnh đã tạo:
- **Xóa nền** - Tạo ảnh transparent (PNG) để dùng trong thiết kế
- **Thay đổi nền** - Thay background bằng màu đơn, gradient, hoặc mô tả cảnh mới

## Phân tích kỹ thuật

### Phương pháp triển khai
Sử dụng **Gemini 2.5 Flash Image** (đã có sẵn trong Lovable AI Gateway) với prompt editing:
- Model có khả năng native image editing
- Gửi ảnh gốc + instruction → nhận ảnh đã chỉnh sửa
- Không cần mask thủ công, AI tự detect subject

### Workflow đề xuất

```text
┌──────────────────────────────────────────────────────────────────┐
│                    Background Editor Flow                         │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  1. Chọn ảnh đã tạo → 2. Mở Background Editor                    │
│                            ↓                                      │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ [Xóa nền] [Thay màu đơn] [Gradient] [Mô tả cảnh mới]        │ │
│  │                                                              │ │
│  │ Ảnh gốc         →        Ảnh đã chỉnh sửa                   │ │
│  │ [Preview]                [Preview]                           │ │
│  │                                                              │ │
│  │ [Áp dụng]  [Thử lại]  [Hủy]                                 │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                            ↓                                      │
│  3. Lưu ảnh mới thay thế hoặc làm phiên bản mới                  │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

---

## Chi tiết kỹ thuật

### File 1: `supabase/functions/edit-image-background/index.ts` (MỚI)

Edge function xử lý background editing với Gemini:

```typescript
interface EditBackgroundRequest {
  imageUrl: string;           // Ảnh gốc cần chỉnh sửa
  editType: 'remove' | 'solid_color' | 'gradient' | 'custom_scene';
  // Options based on editType
  solidColor?: string;        // e.g. "#ffffff"
  gradientFrom?: string;      // e.g. "#6366f1"
  gradientTo?: string;        // e.g. "#ec4899"
  gradientDirection?: 'vertical' | 'horizontal' | 'diagonal';
  customScenePrompt?: string; // e.g. "beach sunset", "modern office"
  // Context
  contentId?: string;
  channel?: string;
  organizationId?: string;
}

// Prompt templates cho từng loại edit
const EDIT_PROMPTS = {
  remove: `
    Remove the background completely and make it transparent.
    Keep only the main subject with clean edges.
    Output should have alpha transparency for the background.
  `,
  solid_color: (color: string) => `
    Replace the entire background with a solid ${color} color.
    Keep the main subject intact with natural edges.
    Maintain the lighting and shadows to look realistic.
  `,
  gradient: (from: string, to: string, direction: string) => `
    Replace the background with a smooth gradient from ${from} to ${to}.
    Direction: ${direction === 'vertical' ? 'top to bottom' : 
                  direction === 'horizontal' ? 'left to right' : 'top-left to bottom-right'}.
    Keep the main subject intact with natural integration.
  `,
  custom_scene: (prompt: string) => `
    Replace the background with: ${prompt}.
    Keep the main subject as is, only change the background.
    Make the integration look natural with appropriate lighting.
  `,
};
```

**Xử lý chính:**
```typescript
// Gọi Gemini với image + editing instruction
const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${LOVABLE_API_KEY}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    model: "google/gemini-2.5-flash-image",
    messages: [{
      role: "user",
      content: [
        { type: "text", text: editPrompt },
        { type: "image_url", image_url: { url: imageUrl } }
      ]
    }],
    modalities: ["image", "text"],
  }),
});

// Extract edited image
const data = await response.json();
const editedImageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
```

### File 2: `src/components/multichannel/BackgroundEditor.tsx` (MỚI)

UI component cho chỉnh sửa background:

**Props:**
```typescript
interface BackgroundEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageUrl: string;
  channel: Channel;
  contentId: string;
  onImageEdited?: (newImageUrl: string) => Promise<void>;
}
```

**State:**
```typescript
const [editType, setEditType] = useState<'remove' | 'solid_color' | 'gradient' | 'custom_scene'>('remove');
const [solidColor, setSolidColor] = useState('#ffffff');
const [gradientFrom, setGradientFrom] = useState('#6366f1');
const [gradientTo, setGradientTo] = useState('#ec4899');
const [gradientDirection, setGradientDirection] = useState<'vertical' | 'horizontal' | 'diagonal'>('vertical');
const [customPrompt, setCustomPrompt] = useState('');
const [isProcessing, setIsProcessing] = useState(false);
const [previewUrl, setPreviewUrl] = useState<string | null>(null);
```

**UI Layout:**
```text
┌─────────────────────────────────────────────────────────────────┐
│ 🎨 Chỉnh sửa Background                                    [X] │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────────┐  ┌──────────────────────┐             │
│  │                      │  │                      │             │
│  │     Ảnh gốc          │  │   Ảnh đã chỉnh sửa  │             │
│  │     [Preview]        │  │     [Preview]        │             │
│  │                      │  │                      │             │
│  └──────────────────────┘  └──────────────────────┘             │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│  Kiểu chỉnh sửa:                                                 │
│  ┌─────────┐ ┌───────────┐ ┌──────────┐ ┌─────────────┐        │
│  │ 🗑️ Xóa  │ │ 🎨 Màu    │ │ 🌈 Grad- │ │ 🖼️ Cảnh    │        │
│  │   nền   │ │   đơn     │ │   ient   │ │    mới     │         │
│  └─────────┘ └───────────┘ └──────────┘ └─────────────┘        │
│                                                                  │
│  [Tùy chọn động dựa trên kiểu được chọn]                        │
│                                                                  │
│  • Xóa nền: Không có tùy chọn thêm                              │
│  • Màu đơn: Color picker                                         │
│  • Gradient: 2 color pickers + direction selector               │
│  • Cảnh mới: Textarea mô tả + Quick presets                     │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│     [Xem trước]          [Áp dụng & Lưu]          [Hủy]        │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Quick Scene Presets:**
```typescript
const SCENE_PRESETS = [
  { label: 'Văn phòng', prompt: 'modern minimalist office with white walls' },
  { label: 'Thiên nhiên', prompt: 'outdoor nature scene with soft green foliage' },
  { label: 'Studio', prompt: 'professional photography studio with soft lighting' },
  { label: 'Gradient', prompt: 'smooth abstract gradient background' },
  { label: 'Bokeh', prompt: 'blurred city lights bokeh background' },
  { label: 'Marble', prompt: 'elegant white marble texture background' },
];
```

### File 3: `src/hooks/useBackgroundEditor.ts` (MỚI)

Hook quản lý logic editing:

```typescript
export function useBackgroundEditor() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const editBackground = async (params: EditBackgroundParams): Promise<string | null> => {
    setIsProcessing(true);
    setError(null);
    
    try {
      const { data, error: fnError } = await supabase.functions.invoke('edit-image-background', {
        body: params,
      });
      
      if (fnError || !data?.success) {
        throw new Error(data?.error || fnError?.message || 'Failed to edit background');
      }
      
      return data.imageUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return null;
    } finally {
      setIsProcessing(false);
    }
  };
  
  return {
    editBackground,
    isProcessing,
    error,
  };
}
```

### File 4: Tích hợp vào `UnifiedImageGenerator.tsx`

Thêm nút "Chỉnh sửa nền" vào phần preview ảnh:

```typescript
// Thêm state
const [backgroundEditorOpen, setBackgroundEditorOpen] = useState(false);
const [editingChannel, setEditingChannel] = useState<Channel | null>(null);

// Thêm nút trong preview card
<Button
  size="sm"
  variant="outline"
  onClick={() => {
    setEditingChannel(channel);
    setBackgroundEditorOpen(true);
  }}
>
  <Wand2 className="w-4 h-4 mr-2" />
  Chỉnh sửa nền
</Button>

// Thêm component
{backgroundEditorOpen && editingChannel && (
  <BackgroundEditor
    open={backgroundEditorOpen}
    onOpenChange={setBackgroundEditorOpen}
    imageUrl={generatedImages[editingChannel]?.imageUrl || ''}
    channel={editingChannel}
    contentId={content.id}
    onImageEdited={async (newUrl) => {
      // Update image in state
      setGeneratedImages(prev => ({
        ...prev,
        [editingChannel]: {
          ...prev[editingChannel],
          imageUrl: newUrl,
        }
      }));
    }}
  />
)}
```

---

## Các tính năng chi tiết

### 1. Xóa nền (Remove Background)
- Output: PNG với transparent background
- Use case: Dùng để ghép vào thiết kế khác
- Prompt: AI tự detect subject và remove background

### 2. Thay màu đơn (Solid Color)
- Color picker với các preset phổ biến (trắng, đen, brand colors)
- Output: Ảnh với background màu đồng nhất
- Use case: Product shots, professional headshots

### 3. Thay gradient
- 2 màu + hướng (vertical/horizontal/diagonal)
- Preset gradients phổ biến
- Use case: Social media posts, marketing materials

### 4. Thay cảnh mới (Custom Scene)
- Text input mô tả cảnh mong muốn
- Quick presets: Văn phòng, Thiên nhiên, Studio, Bokeh...
- Use case: Thay đổi context cho sản phẩm/người

---

## Files cần tạo/chỉnh sửa

| File | Loại | Mô tả |
|------|------|-------|
| `supabase/functions/edit-image-background/index.ts` | **MỚI** | Edge function xử lý edit với Gemini |
| `src/components/multichannel/BackgroundEditor.tsx` | **MỚI** | UI dialog chỉnh sửa background |
| `src/hooks/useBackgroundEditor.ts` | **MỚI** | Hook quản lý logic |
| `src/components/multichannel/UnifiedImageGenerator.tsx` | Chỉnh sửa | Tích hợp nút và component |
| `supabase/config.toml` | Chỉnh sửa | Đăng ký function mới |

---

## Xử lý lỗi & Edge cases

1. **Image format**: Validate input là image URL hợp lệ
2. **Rate limit (429)**: Hiển thị toast và đề nghị thử lại sau
3. **Generation failed**: Cho phép thử lại với cùng settings
4. **Transparent output**: Đảm bảo PNG output cho remove background
5. **Preview before save**: Cho xem trước trước khi commit changes

---

## Lợi ích

1. ✅ **Linh hoạt hơn** - Không cần tạo lại ảnh từ đầu khi chỉ muốn đổi nền
2. ✅ **Tiết kiệm thời gian** - Chỉnh sửa nhanh thay vì regenerate
3. ✅ **Đa dạng output** - Transparent, solid, gradient, custom scene
4. ✅ **Professional results** - AI tự detect subject và blend tự nhiên
5. ✅ **Tái sử dụng ảnh** - Xuất transparent để dùng trong nhiều context

---

## Testing

1. Tạo ảnh → Mở Background Editor → Chọn "Xóa nền" → Verify transparent output
2. Thử "Màu đơn" với brand color → Verify màu đúng
3. Thử "Gradient" → Verify hướng và màu đúng
4. Thử "Cảnh mới" với preset "Văn phòng" → Verify cảnh hợp lý
5. Test error handling với rate limit scenario
