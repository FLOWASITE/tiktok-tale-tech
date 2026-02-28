
## Sửa nút Back trong quá trình tạo ảnh

### Vấn đề
Nút "Quay lại" bị vô hiệu hóa (`disabled`) khi đang tạo ảnh. Người dùng không thể quay lại, và quá trình tạo ảnh bị chặn hoàn toàn.

### Yêu cầu
Khi bấm Back, người dùng quay về màn hình setup, nhưng quá trình tạo ảnh vẫn tiếp tục chạy ngầm (background).

### Thay đổi

**File 1: `src/components/multichannel/SimpleImageGenerator.tsx`**

- Bỏ `disabled={batchGen.isGenerating}` trên nút Back (dòng 457)
- Sửa `handleBackToSetup`: chỉ chuyển `viewMode` về `'setup'` mà KHÔNG cancel hay reset progress. Quá trình tạo ảnh tiếp tục chạy ngầm, khi xong sẽ tự cập nhật state.

```typescript
const handleBackToSetup = () => {
  if (!batchGen.isGenerating) {
    batchGen.resetProgress();
  }
  setViewMode('setup');
};
```

**File 2: `src/components/multichannel/UnifiedImageGenerator.tsx`**

- Áp dụng cùng logic: bỏ `disabled={batchGen.isGenerating}` (dòng 1482) và sửa `handleBackToSetup` tương tự.

### Kết quả
- Nút Back luôn bấm được
- Quay về setup ngay lập tức
- Ảnh vẫn tiếp tục tạo ở nền, khi xong sẽ tự động lưu và cập nhật mockup
