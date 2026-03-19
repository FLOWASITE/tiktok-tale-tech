

## Tự động tạo ảnh sau khi nội dung hoàn tất

### Thay đổi

**File: `src/pages/MultiChannelCreate.tsx`**

Thêm `useEffect` theo dõi `generationState === 'complete'` để tự động gọi `imagePipeline.startPipeline()` ngay khi nội dung tạo xong, thay vì đợi user nhấn nút ở Step 5.

Logic:
1. Khi `generationState` chuyển sang `'complete'` và có `generatedContentId` + `selectedBrandId`
2. Tự động thu thập `channelTexts` từ `getChannelText` cho tất cả channels trong `formData`
3. Gọi `imagePipeline.startPipeline(...)` với contentMeta từ formData
4. Dùng ref để đảm bảo chỉ trigger 1 lần per generation (tránh race condition)

**File: `src/components/multichannel/MultiChannelFormWizard.tsx`**

Cập nhật Step 5 UI: thay nút "Tạo ảnh" bằng thông báo rằng ảnh đang được tạo tự động (khi pipeline đang chạy), giữ nút "Thử lại" cho trường hợp lỗi.

### Chi tiết kỹ thuật

```text
// MultiChannelCreate.tsx — thêm useEffect
const autoImageTriggeredRef = useRef(false);

useEffect(() => {
  if (generationState === 'complete' && generatedContentId && selectedBrandId 
      && !autoImageTriggeredRef.current && imagePipeline.phase === 'idle') {
    autoImageTriggeredRef.current = true;
    // Collect channel texts
    const channelTexts = {};
    formData.channels.forEach(ch => channelTexts[ch] = getChannelText(ch));
    // Auto-start pipeline
    imagePipeline.startPipeline(generatedContentId, formData.channels, channelTexts, {
      contentGoal, contentRole, contentAngle, topic, promptMode
    });
  }
}, [generationState, generatedContentId]);

// Reset ref khi tạo mới
handleCreateAnother → autoImageTriggeredRef.current = false;
```

