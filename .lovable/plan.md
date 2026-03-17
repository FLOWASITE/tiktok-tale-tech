

# Cập nhật Workflow: 5 bước → 6 bước (thêm Tạo ảnh AI)

## Thay đổi

Hiện tại workflow có 5 bước. Cần chèn **Bước 5: Tạo ảnh AI** và đẩy "Phê duyệt & Lên lịch" xuống **Bước 6**.

### 1. `src/i18n/locales/vi.json`
- `titleHighlight`: "trong 5 bước" → "trong 6 bước"
- Đổi tên `step5` hiện tại thành `step6` (Phê duyệt & Lên lịch)
- Thêm `step5` mới:
  - **Title**: "Tạo ảnh AI đa kênh"
  - **Description**: "AI tự động tạo ảnh tối ưu cho từng kênh (TikTok 9:16, Instagram 4:5, Facebook 16:9). 3 chế độ: Để AI lo, Giữ Brand, hoặc Toàn quyền kiểm soát."
  - **Feature**: "Auto logo overlay + 5 kiểu layout thông minh"

### 2. `src/i18n/locales/en.json`
- `titleHighlight`: "in 5 Steps" → "in 6 Steps"
- Tương tự đổi step5 → step6, thêm step5 mới bằng tiếng Anh

### 3. `src/components/landing/WorkflowSection.tsx`
- Thêm step6 vào mảng `steps`: `{ num: 6, key: "step6", hasFeature: true }`
- Step 5 mới (tạo ảnh AI) sẽ render dạng text (không có ảnh screenshot), tương tự step 3
- Step 6 kế thừa carousel ảnh `workflowPublishImg` từ step 5 cũ
- Cập nhật render logic: `step.num === 5` → render text-only, `step.num === 6` → render carousel với `step5Images`

