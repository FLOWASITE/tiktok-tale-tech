
# Thêm Phong Cách Ảnh Có Text (Social Graphics)

## Tổng Quan Vấn Đề

Hiện tại hệ thống tạo ảnh **KHÔNG bao gồm text** trong ảnh (rule cứng: "DO NOT include any text, words, letters, or typography"). Điều này tốt cho ảnh nền, nhưng thiếu tùy chọn cho:

- **Social Graphics** với quote/hook message
- **Ảnh carousel** với text overlay
- **Story/Reel covers** với tiêu đề

Trong khi đó, data `text_overlay` từ Hook đã có sẵn nhưng chưa được sử dụng.

---

## Giải Pháp Đề Xuất

### 1. Thêm "Content Type" mới: `with_text` vs `background_only`

| Mode | Mô tả | Khi nào dùng |
|------|-------|--------------|
| `background_only` | Ảnh nền không có text (mặc định hiện tại) | Khi muốn overlay text bằng tool khác |
| `with_text` | Social graphic có text từ Hook | Quote cards, carousel slides, story covers |

### 2. UI Flow Mới

```
┌──────────────────────────────────────────────────┐
│ Loại ảnh                                         │
├──────────────────────────────────────────────────┤
│ 🖼️ Ảnh nền          │  📝 Ảnh có Text           │
│ (Background)        │  (Social Graphic)         │
│                     │                            │
│ Không có chữ,       │  Có hook/quote hiển thị   │
│ phù hợp overlay     │  Typography tích hợp      │
│ bằng tool khác      │  Sẵn sàng đăng bài        │
└──────────────────────────────────────────────────┘

[Nếu chọn "Ảnh có Text"]

┌──────────────────────────────────────────────────┐
│ Text hiển thị trên ảnh:                          │
│ ┌──────────────────────────────────────────────┐ │
│ │ "3 sai lầm skincare khiến da bạn tệ hơn"    │ │
│ └──────────────────────────────────────────────┘ │
│ [Lấy từ Hook] [Tự nhập]                          │
│                                                  │
│ Vị trí text: [Center] [Top] [Bottom]             │
│ Typography style: [Modern] [Classic] [Bold]     │
└──────────────────────────────────────────────────┘
```

---

## Chi Tiết Kỹ Thuật

### File Changes

| File | Thay đổi |
|------|----------|
| `src/hooks/useSocialImageGeneration.ts` | Thêm type `ImageContentType`, param `textToInclude`, `textPosition` |
| `src/components/multichannel/UnifiedImageGenerator.tsx` | UI cho Content Type selection, text input |
| `src/components/multichannel/StrategicContextPreview.tsx` | Hiển thị text sẽ được thêm vào ảnh |
| `supabase/functions/_shared/image-prompt-builder.ts` | Logic điều kiện: bỏ rule "no text" khi mode = `with_text` |
| `supabase/functions/generate-brand-image/index.ts` | Nhận param mới và pass xuống builder |

---

### 1. Type Updates (`useSocialImageGeneration.ts`)

```typescript
export type ImageContentType = 'background_only' | 'with_text';

export type TextPosition = 'center' | 'top' | 'bottom' | 'top-left' | 'bottom-right';

export type TypographyStyle = 'modern' | 'classic' | 'bold' | 'minimal';

interface GenerateImageParams {
  // ... existing params
  
  // NEW: Text-in-image params
  imageContentType?: ImageContentType;
  textToInclude?: string;        // From hook.text_overlay or custom
  textPosition?: TextPosition;
  typographyStyle?: TypographyStyle;
}
```

---

### 2. Prompt Builder Logic

```typescript
// In image-prompt-builder.ts

function buildTextInImageSection(
  textToInclude?: string,
  textPosition?: TextPosition,
  typographyStyle?: TypographyStyle
): string {
  if (!textToInclude) return '';
  
  const positionGuide: Record<TextPosition, string> = {
    'center': 'Text nằm giữa ảnh, làm focal point',
    'top': 'Text ở 1/3 trên, visual ở dưới',
    'bottom': 'Text ở 1/3 dưới, visual ở trên',
    'top-left': 'Text góc trên trái, style quote',
    'bottom-right': 'Text góc dưới phải, style caption',
  };
  
  const styleGuide: Record<TypographyStyle, string> = {
    'modern': 'Sans-serif font, clean, contemporary',
    'classic': 'Serif font, elegant, timeless',
    'bold': 'Heavy weight, impactful, attention-grabbing',
    'minimal': 'Thin weight, subtle, refined',
  };
  
  return `
## TEXT IN IMAGE (REQUIRED):
Include this exact text in the image:
"${textToInclude}"

Typography Guidelines:
- Position: ${positionGuide[textPosition || 'center']}
- Style: ${styleGuide[typographyStyle || 'modern']}
- Ensure high contrast and readability
- Text should be the primary focal element
- Use brand colors for text if appropriate`;
}

// Modify buildImagePrompt to conditionally apply text rules
export function buildImagePrompt(params: ImagePromptParams): string {
  // ...existing code...
  
  // Conditional text rules
  if (params.imageContentType === 'with_text' && params.textToInclude) {
    prompt += buildTextInImageSection(
      params.textToInclude,
      params.textPosition,
      params.typographyStyle
    );
    
    // Modified rules for with_text mode
    prompt += `
    
## CRITICAL RULES (WITH TEXT MODE):
1. INCLUDE the specified text prominently in the image
2. Text must be clearly readable and high contrast
3. DO NOT include any logos or brand marks
4. Background/visual should complement, not compete with text
5. Maintain brand-appropriate color temperature`;
  } else {
    // Original no-text rules
    prompt += `
    
## CRITICAL RULES (MUST FOLLOW):
1. DO NOT include any text, words, letters, or typography in the image
2. DO NOT include any logos or brand marks
...`;
  }
}
```

---

### 3. UI Component Update

```tsx
// In UnifiedImageGenerator.tsx

// New state
const [imageContentType, setImageContentType] = useState<'background_only' | 'with_text'>('background_only');
const [textToInclude, setTextToInclude] = useState<string>('');
const [textPosition, setTextPosition] = useState<TextPosition>('center');

// Auto-fill from hook text_overlay
useEffect(() => {
  if (mode === 'single' && selectedChannel) {
    const hook = content.channel_content?.[selectedChannel]?.selected_hooks?.[0];
    if (hook?.text_overlay) {
      setTextToInclude(hook.text_overlay);
    }
  }
}, [mode, selectedChannel, content]);

// UI
<div className="space-y-4">
  <Label>Loại ảnh</Label>
  <div className="grid grid-cols-2 gap-3">
    <button
      onClick={() => setImageContentType('background_only')}
      className={cn(
        "p-4 rounded-lg border text-left transition-all",
        imageContentType === 'background_only' 
          ? "border-primary bg-primary/5" 
          : "border-border hover:border-primary/50"
      )}
    >
      <ImageIcon className="w-5 h-5 mb-2" />
      <div className="font-medium">Ảnh nền</div>
      <div className="text-xs text-muted-foreground">
        Không có text, phù hợp overlay
      </div>
    </button>
    
    <button
      onClick={() => setImageContentType('with_text')}
      className={cn(
        "p-4 rounded-lg border text-left transition-all",
        imageContentType === 'with_text' 
          ? "border-primary bg-primary/5" 
          : "border-border hover:border-primary/50"
      )}
    >
      <Type className="w-5 h-5 mb-2" />
      <div className="font-medium">Social Graphic</div>
      <div className="text-xs text-muted-foreground">
        Có hook/quote trên ảnh
      </div>
    </button>
  </div>
  
  {/* Text options when with_text selected */}
  {imageContentType === 'with_text' && (
    <div className="space-y-3 p-4 bg-muted/30 rounded-lg">
      <div>
        <Label>Text hiển thị</Label>
        <Textarea
          value={textToInclude}
          onChange={(e) => setTextToInclude(e.target.value)}
          placeholder="Nhập text hoặc dùng hook message..."
          className="mt-1.5"
        />
        {hookTextOverlay && (
          <Button
            variant="ghost"
            size="sm"
            className="mt-2 text-xs"
            onClick={() => setTextToInclude(hookTextOverlay)}
          >
            <Sparkles className="w-3 h-3 mr-1" />
            Dùng text từ Hook
          </Button>
        )}
      </div>
      
      <div>
        <Label>Vị trí text</Label>
        <Select value={textPosition} onValueChange={setTextPosition}>
          <SelectTrigger className="mt-1.5">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="center">Giữa ảnh</SelectItem>
            <SelectItem value="top">Phía trên</SelectItem>
            <SelectItem value="bottom">Phía dưới</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  )}
</div>
```

---

### 4. StrategicContextPreview Update

Thêm preview của text sẽ được thêm vào ảnh:

```tsx
{imageContentType === 'with_text' && textToInclude && (
  <div className="mt-3 p-3 bg-primary/5 rounded-lg border border-primary/20">
    <div className="flex items-center gap-2 mb-2">
      <Type className="w-4 h-4 text-primary" />
      <span className="text-sm font-medium">Text trong ảnh</span>
    </div>
    <p className="text-sm text-foreground font-medium">
      "{textToInclude}"
    </p>
    <p className="text-xs text-muted-foreground mt-1">
      Vị trí: {textPosition} • Style: {typographyStyle}
    </p>
  </div>
)}
```

---

## Lưu Ý Quan Trọng

1. **AI Limitation**: Gemini/DALL-E không phải lúc nào cũng render text chính xác. Có thể cần nhiều lần thử hoặc sử dụng post-processing overlay thay vì AI generate text.

2. **Alternative Approach**: Thay vì yêu cầu AI tạo text trong ảnh, có thể:
   - Tạo ảnh nền trước
   - Dùng Canvas API hoặc library để overlay text lên ảnh
   - Điều này cho kết quả text chính xác hơn

3. **Khuyến nghị**: Bắt đầu với AI-generated text, nhưng có fallback plan cho canvas-based overlay nếu kết quả không tốt.

---

## Thời Gian Ước Tính

| Task | Thời gian |
|------|-----------|
| Update types & interfaces | 5 phút |
| UI cho Content Type selection | 15 phút |
| Prompt builder logic | 10 phút |
| Backend param handling | 5 phút |
| StrategicContextPreview update | 5 phút |
| Testing | 10 phút |
| **Total** | **~50 phút** |

