

# Fix: Cho phép click "Tạo ảnh AI" khi nội dung chưa xong + toast + queue progress

## Thay đổi

### 1. `src/pages/MultiChannelCreate.tsx` (dòng 283-286)

Thêm toast warning khi `generatedContentId` chưa có, thay vì return im lặng:

```typescript
onStartImagePipeline={(channels, channelTexts, contentMeta) => {
  if (!generatedContentId || !selectedBrandId) {
    toast.warning('Vui lòng chờ nội dung đa kênh tạo xong trước khi tạo ảnh');
    return;
  }
  imagePipeline.startPipeline(generatedContentId, channels, channelTexts, contentMeta);
}}
```

### 2. `src/components/multichannel/MultiChannelFormWizard.tsx` (dòng 2042-2047)

- Giữ nút luôn clickable (bỏ `disabled` cứng), nhưng đổi style khi chưa sẵn sàng
- Khi `generationComplete` = false → hiện label "Đang chờ nội dung..." với style mờ hơn, vẫn cho click (để trigger toast)
- Khi `generationComplete` = true → hiện "Tạo ảnh AI" với glow animation như hiện tại

```typescript
<Button
  onClick={() => { /* existing onClick logic */ }}
  className={cn(
    "w-full gap-3 text-base font-semibold shadow-lg",
    generationComplete
      ? "gradient-primary glow-primary shadow-primary/25 animate-pulse hover:animate-none"
      : "bg-muted text-muted-foreground hover:bg-muted/80"
  )}
  size="lg"
>
  {generationComplete ? (
    <>
      <Sparkles className="w-6 h-6" />
      Tạo ảnh AI
      <span>...</span>
    </>
  ) : (
    <>
      <Loader2 className="w-5 h-5 animate-spin" />
      Đang chờ nội dung...
    </>
  )}
</Button>
```

Sửa 2 file, ~15 dòng thay đổi. User click bất kỳ lúc nào đều nhận được feedback rõ ràng.

