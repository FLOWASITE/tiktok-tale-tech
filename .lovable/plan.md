

# Mở rộng Input ý tưởng: Input → Textarea

## Vấn đề
Input single-line (`<Input>` h-12) không đủ chỗ cho chủ đề dài. Cần chuyển sang `<Textarea>` nhưng giữ giao diện gọn gàng.

## Giải pháp
Đổi `<Input>` thành `<Textarea>` với `min-h-[52px]` và `max-h-[120px]`, hỗ trợ auto-resize theo nội dung (rows=1 mặc định, tự giãn khi gõ nhiều). Badge đếm ký tự giữ nguyên vị trí absolute góc phải dưới.

## Thay đổi

### 1. `src/components/CarouselForm.tsx`
- `topicInputRef`: `HTMLInputElement` → `HTMLTextAreaElement`
- `<Input>` → `<Textarea>` với `rows={1}`, `resize-none`, auto-resize qua `onInput` handler
- Badge ký tự chuyển sang bottom-right

### 2. `src/components/multichannel/MultiChannelFormWizard.tsx`
- Tương tự: `topicInputRef` → `HTMLTextAreaElement`, `<Input>` → `<Textarea>` auto-resize

### 3. `src/components/multichannel/MultiChannelFormStepper.tsx`
- Tương tự

### Auto-resize logic (inline)
```typescript
onInput={(e) => {
  const el = e.currentTarget;
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 120) + 'px';
}}
```

