

# Thêm tùy chọn bỏ qua Core Content + cảnh báo thực tế

## Thay đổi trong `MultiChannelFormWizard.tsx`

### 1. Thêm state `skipCoreContent`
- `const [skipCoreContent, setSkipCoreContent] = useState(false);`

### 2. UI tại Step 2 — Switch + Alert cảnh báo
- Thêm Switch ở đầu Step 2 (trước Topic Preview card): **"Tạo nhanh — bỏ qua Core Content"**
- Khi bật, hiển thị Alert cảnh báo với nội dung thực tế:
  - Icon `AlertTriangle`, border amber
  - **Tiêu đề**: "Nội dung sẽ tạo nhanh hơn nhưng có hạn chế"
  - **Nội dung cảnh báo**:
    - Không có Core Content làm nguồn gốc → nội dung giữa các kênh có thể **không đồng nhất về thông điệp**
    - Mỗi kênh sẽ được AI tạo độc lập từ chủ đề → **tone, thông tin chi tiết có thể khác nhau**
    - Không thể dùng tính năng **đánh giá chất lượng Core Content** (critique score)
    - Phù hợp cho bài viết đơn giản, tin nhanh. **Không khuyến khích cho chiến dịch quan trọng**
- Khi bật: ẩn toàn bộ form tạo Core Content, chỉ hiện Switch + Alert

### 3. Cập nhật logic
- `canProceed` case 2: thêm `|| skipCoreContent` 
- `handleNext` step 2: bỏ block check khi `skipCoreContent = true`
- `handleSubmitForm`: khi `skipCoreContent`, truyền `coreContentId: null`

### File cần sửa
- `src/components/multichannel/MultiChannelFormWizard.tsx`

