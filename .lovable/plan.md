

# Manual Mode → Navigate to "Tạo ảnh AI" in Viewer

## Problem
Khi chọn "Tự chọn & tạo sau" (Manual), sau khi tạo văn bản xong, wizard hiện đang show một UI inline tạo ảnh tự chế tại Step 5. User muốn thay vào đó **navigate thẳng đến trang `/multichannel` (Viewer)** — nơi đã có nút **"Tạo ảnh AI"** hoàn chỉnh với đầy đủ chức năng.

## Solution — 1 file

### `src/components/multichannel/MultiChannelFormWizard.tsx`

**1. Thay đổi auto-advance logic (line 893-899)**

Khi `imageMode === 'manual'` và `generationComplete`, thay vì advance đến Step 5, navigate thẳng đến `/multichannel` với `viewContentId` từ kết quả multichannel generation.

```tsx
useEffect(() => {
  if (generationComplete && currentStep === 4) {
    setCompletedSteps(prev => [...prev.filter(s => s !== 4), 4]);
    if (imageMode === 'manual') {
      // Navigate to viewer — user uses "Tạo ảnh AI" button there
      navigate('/multichannel', { 
        state: { viewContentId: formData.coreContentId } 
      });
    } else {
      setCurrentStep(5);
    }
  }
}, [generationComplete, currentStep]);
```

Nếu `coreContentId` không đúng ID của multichannel content, sẽ cần lấy ID từ task result (`result.data.id`) và lưu vào state (ví dụ `multiChannelContentId`).

**2. Xóa toàn bộ block manual UI tại Step 5 (line ~2063-2195)**

Block `{imageMode === 'manual' && generationComplete ? (...)}` với grid cards, mode badges, v.v. sẽ bị xóa vì không còn cần thiết — user sẽ không bao giờ thấy Step 5 trong manual mode nữa.

## Kết quả
- **Auto mode**: Vẫn advance đến Step 5, auto-trigger pipeline như cũ
- **Manual mode**: Sau khi văn bản xong → navigate đến Viewer → user bấm "Tạo ảnh AI" trên toolbar để tạo ảnh với đầy đủ tùy chọn (Giữ Brand / Toàn quyền / v.v.)

