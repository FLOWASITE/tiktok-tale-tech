

## Plan: Thêm Step 5 "Tạo ảnh" vào Wizard thay vì tự động tạo ảnh

### Hiện trạng
- Wizard hiện có 4 bước: Chủ đề → Core Content → Vai trò → Đa kênh
- Sau khi tạo nội dung đa kênh ở Step 4, hệ thống **tự động** gọi `imagePipeline.startPipeline()` để tạo ảnh cho tất cả kênh
- User không có quyền kiểm soát trước khi ảnh bắt đầu tạo

### Thay đổi

**1. `MultiChannelFormWizard.tsx` — Thêm Step 5**
- Thêm step `{ id: 5, title: 'Tạo ảnh', icon: <Image /> }` vào mảng `STEPS`
- Step 4 thay vì là bước cuối (nút "Tạo"), sẽ trở thành bước trung gian (nút "Tiếp tục")
- Step 5 hiển thị:
  - Tóm tắt nội dung đã tạo cho từng kênh
  - Tùy chọn cấu hình ảnh (style, logo, text overlay) — tích hợp `ImageAdvancedOptions`
  - Nút **"Tạo ảnh AI"** để bắt đầu tạo ảnh
  - Hoặc nút **"Bỏ qua"** để hoàn tất mà không tạo ảnh
- Cập nhật navigation footer: `currentStep < 5` cho nút "Tiếp tục", step counter `{currentStep}/5`

**2. `MultiChannelFormWizard.tsx` — Thêm props mới**
- Thêm `onStartImagePipeline?: (config) => void` callback để wizard thông báo lên parent khi user nhấn "Tạo ảnh"
- Thêm props nhận trạng thái image pipeline từ parent (phase, progress, results)

**3. `MultiChannelCreate.tsx` — Bỏ auto-trigger, chuyển sang manual**
- Xóa block `// AUTO-TRIGGER IMAGE PIPELINE` trong `handleGenerate` (lines 176-199)
- Thêm handler `handleStartImagePipeline` được gọi từ Step 5
- Truyền handler và image pipeline state xuống `MultiChannelFormWizard`

**4. `MultiChannelFormWizard.tsx` — Step 5 UI**
- Sau khi Step 4 hoàn tất (generationState === 'complete'), wizard tự động chuyển sang Step 5
- Step 5 hiển thị `SimpleImageGenerator`-style UI hoặc tích hợp `ImageStreamingGrid` để hiển thị tiến trình
- Nút "Hoàn tất" ở cuối để navigate về `/multichannel`

### Files cần sửa
- `src/components/multichannel/MultiChannelFormWizard.tsx` — thêm Step 5, UI tạo ảnh
- `src/pages/MultiChannelCreate.tsx` — bỏ auto-trigger, thêm manual handler

