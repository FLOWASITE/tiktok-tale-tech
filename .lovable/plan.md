

# Thêm nút "Brainstorm AI" nổi bật vào các form tạo nội dung

## Vấn đề
Sau khi xóa tab Brainstorm AI khỏi TopicIdeaHub, không còn lối vào Brainstorm AI trong form Multichannel và Carousel. Chỉ ScriptFormStepper còn nút này.

## Giải pháp
Thêm nút **"Brainstorm AI"** nổi bật (gradient, animated icon) cạnh label "Chủ đề" trong cả 3 form, mở `TopicBrainstormSheet` fullscreen khi click.

## Thay đổi

### 1. `src/components/multichannel/MultiChannelFormStepper.tsx`
- Import `TopicBrainstormSheet`, `MessageSquare`
- Thêm state `showBrainstormSheet`
- Thêm nút gradient "Brainstorm AI" cạnh label "Chủ đề / Ý tưởng"
- Render `TopicBrainstormSheet` với `onSelectTopic` → cập nhật `formData.topic`

### 2. `src/components/multichannel/MultiChannelFormWizard.tsx`
- Tương tự: import, state, nút, và render sheet

### 3. `src/components/CarouselForm.tsx`
- Tương tự: import, state, nút, và render sheet

### 4. `src/components/script/ScriptFormStepper.tsx`
- Nâng cấp style nút hiện có cho đồng bộ với các form khác

### Style nút nổi bật
```typescript
<Button
  type="button"
  variant="outline"
  size="sm"
  onClick={() => setShowBrainstormSheet(true)}
  className="h-7 gap-1.5 text-xs bg-gradient-to-r from-primary/10 to-purple-500/10 border-primary/40 text-primary hover:from-primary/20 hover:to-purple-500/20 shadow-sm"
>
  <MessageSquare className="w-3.5 h-3.5 animate-pulse" />
  Brainstorm AI
  <Sparkles className="w-3 h-3" />
</Button>
```

Nút sử dụng gradient nền, border màu primary, icon pulse animation để thu hút chú ý.

