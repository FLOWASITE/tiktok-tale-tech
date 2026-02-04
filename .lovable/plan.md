
# Bước 1: Hỗ Trợ Social Graphics trong Batch Mode

## Tổng Quan

Hiện tại, tính năng Social Graphics (ảnh có text) **CHỈ hoạt động trong Single Mode**. Batch Mode chưa truyền các params `imageContentType`, `textToInclude`, `textPosition`, `typographyStyle` xuống backend.

## Phạm Vi Thay Đổi

| File | Thay đổi |
|------|----------|
| `src/hooks/useAutoImageGeneration.ts` | Thêm params Social Graphics vào `AutoGenerateOptions` và `generateWithRetry` |
| `src/components/multichannel/UnifiedImageGenerator.tsx` | Truyền params Social Graphics vào `batchOptions` |

## Chi Tiết Kỹ Thuật

### 1. Update `useAutoImageGeneration.ts`

Thêm types và params mới cho Social Graphics:

```typescript
// Thêm vào AutoGenerateOptions interface
export interface AutoGenerateOptions {
  // ... existing params
  
  // NEW: Social Graphics (text-in-image) params
  imageContentType?: 'background_only' | 'with_text';
  textToInclude?: string;
  textPosition?: 'center' | 'top' | 'bottom' | 'top-left' | 'bottom-right';
  typographyStyle?: 'modern' | 'classic' | 'bold' | 'minimal';
}
```

Truyền xuống `generate-brand-image` trong `generateWithRetry`:

```typescript
// Trong body của supabase.functions.invoke
{
  // ... existing params
  
  // NEW: Pass Social Graphics params
  imageContentType: options.imageContentType,
  textToInclude: options.textToInclude,
  textPosition: options.textPosition,
  typographyStyle: options.typographyStyle,
}
```

### 2. Update `UnifiedImageGenerator.tsx`

Thêm Social Graphics params vào `batchOptions` useMemo:

```typescript
const batchOptions = useMemo(() => ({
  // ... existing params
  
  // NEW: Social Graphics params for batch mode
  imageContentType,
  textToInclude: imageContentType === 'with_text' ? textToInclude : undefined,
  textPosition: imageContentType === 'with_text' ? textPosition : undefined,
  typographyStyle: imageContentType === 'with_text' ? typographyStyle : undefined,
}), [/* dependencies */]);
```

## Lưu Ý Quan Trọng

**Batch Mode với Text**: Trong batch mode, tất cả các kênh sẽ dùng **CÙNG MỘT text overlay**. Điều này có thể không lý tưởng vì mỗi kênh có hook message khác nhau. 

Tuy nhiên, đây là bước đầu tiên. Phiên bản nâng cao sau có thể cho phép **text khác nhau cho từng kênh** (sử dụng `hookMessages` map).

## Flow Hoàn Chỉnh

```
User chọn "Social Graphic" + nhập text
           ↓
┌─────────────────────────────────────┐
│ Batch Mode                          │
│ batchOptions với imageContentType   │
│ = 'with_text' + textToInclude       │
└─────────────────────────────────────┘
           ↓
useAutoImageGeneration.generateAllImages()
           ↓
Mỗi channel → generateWithRetry()
           ↓
supabase.functions.invoke('generate-brand-image', {
  body: { 
    imageContentType: 'with_text',
    textToInclude: "...",
    textPosition: "center",
    ...
  }
})
           ↓
Backend buildImagePrompt() → TEXT IN IMAGE section
           ↓
AI tạo ảnh có text
```

## Thời Gian Ước Tính

| Task | Thời gian |
|------|-----------|
| Update AutoGenerateOptions types | 2 phút |
| Update generateWithRetry function | 3 phút |
| Update batchOptions in UI | 3 phút |
| Testing | 5 phút |
| **Total** | **~13 phút** |
