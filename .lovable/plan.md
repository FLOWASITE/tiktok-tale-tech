

# Thêm nút "Tạo ảnh" thủ công vào Step 5

## Vấn đề

Step 5 ("Tạo ảnh") hiện tại hoàn toàn tự động — không có nút bấm nào để người dùng chủ động tạo ảnh. Khi ở trạng thái idle, chỉ hiển thị text "Đang chờ nội dung hoàn tất..." hoặc "Đang chuẩn bị tạo ảnh tự động..." mà không có CTA rõ ràng.

Nếu auto-trigger không hoạt động (ví dụ: race condition, state không đúng), người dùng bị stuck không có cách nào trigger thủ công — chỉ có nút "Thử lại" khi đã lỗi và nút "Bỏ qua".

## Giải pháp

Thêm nút **"Tạo ảnh AI"** rõ ràng vào Step 5 khi `imagePhase === 'idle'` và `generationComplete === true` (nội dung đã tạo xong). Nút này gọi cùng logic `onStartImagePipeline` như auto-trigger.

## Thay đổi — 1 file

### `src/components/multichannel/MultiChannelFormWizard.tsx` (~line 1995)

Thay block hiện tại:
```tsx
{imagePhase === 'idle' && generationComplete && (
  <div className="flex items-center gap-2 text-sm text-muted-foreground">
    <Loader2 className="w-4 h-4 animate-spin" />
    Đang chuẩn bị tạo ảnh tự động...
  </div>
)}
```

Thành:
```tsx
{imagePhase === 'idle' && generationComplete && (
  <div className="flex flex-col items-center gap-3">
    <Button
      onClick={() => {
        if (getChannelText && onStartImagePipeline) {
          const channelTexts: Record<string, string> = {};
          formData.channels.forEach(ch => {
            channelTexts[ch] = getChannelText(ch);
          });
          onStartImagePipeline(formData.channels, channelTexts, {
            contentGoal: formData.contentGoal,
            contentRole: formData.contentRole,
            contentAngle: formData.contentAngle,
            topic: formData.topic,
            promptMode,
          });
        }
      }}
      className="w-full gap-2 gradient-primary glow-primary"
      size="lg"
    >
      <Sparkles className="w-5 h-5" />
      Tạo ảnh AI cho {formData.channels.length} kênh
    </Button>
    <p className="text-xs text-muted-foreground">
      Hoặc ảnh sẽ tự động được tạo sau vài giây
    </p>
  </div>
)}
```

Giữ nguyên auto-trigger logic trong `MultiChannelCreate.tsx` — nút thủ công là fallback song song, đảm bảo người dùng luôn có CTA rõ ràng.

