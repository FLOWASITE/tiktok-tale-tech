
# Phân tích và Đề xuất Cải tiến Hệ thống Tạo ảnh AI

## Tổng quan Hệ thống Hiện tại

### Kiến trúc Backend
- **Edge Function chính**: `generate-brand-image` - sử dụng `google/gemini-3-pro-image-preview`
- **Logo Overlay**: `overlay-logo-canvas` - sử dụng ImageScript (canvas-based, không AI)
- **Prompt Builder**: `_shared/image-prompt-builder.ts` - xây dựng prompt với Brand Context

### UI Components
| Component | Chức năng | Vị trí |
|-----------|-----------|--------|
| `AutoImageGenerator` | Batch generate cho nhiều channels | Dialog từ nút "Tạo ảnh AI" |
| `ImagePromptEditor` | Generate đơn lẻ với chỉnh sửa prompt | Dialog từ nút "Ảnh" trong content |
| `ImageStreamingGrid/Card` | Hiển thị tiến trình streaming | Bên trong AutoImageGenerator |
| `ChannelImageHistory` | Lịch sử ảnh đã tạo | Dialog từ nút History |

---

## Các vấn đề phát hiện

### 1. UI/UX Issues

#### A. Trùng lặp chức năng giữa hai dialog
**Vấn đề**: `AutoImageGenerator` và `ImagePromptEditor` có nhiều tính năng giống nhau nhưng UI khác nhau, gây confusion:
- Cả hai đều có Style Presets, Aspect Ratio, Negative Prompt
- `AutoImageGenerator`: Batch mode, có Logo options
- `ImagePromptEditor`: Single mode, có chỉnh sửa Prompt

**Giải pháp đề xuất**:
- Gộp thành một component thống nhất `UnifiedImageGenerator`
- Có toggle giữa "Single Channel" và "Batch Mode"
- Giữ khả năng chỉnh sửa prompt trong cả 2 mode

#### B. Thiếu Preview trước khi Generate
**Vấn đề**: User không biết ảnh sẽ như thế nào trước khi generate (tốn thời gian + credits)

**Giải pháp đề xuất**:
- Thêm "Prompt Preview" collapsible section
- Hiển thị tóm tắt các thông số: Brand Colors, Industry, Persona, Style
- Thêm "Similar Images" từ lịch sử để user tham khảo

#### C. Progress Feedback không đủ chi tiết
**Vấn đề**: Khi generating, chỉ thấy spinner, không biết đang ở bước nào

**Giải pháp đề xuất**:
- Thêm step indicator: "Fetching Brand" → "Building Prompt" → "Generating" → "Uploading" → "Done"
- Hiển thị estimated time dựa trên average generation time

#### D. Aspect Ratio Visual Preview
**Vấn đề**: User chọn aspect ratio nhưng không thấy preview khung hình

**Giải pháp đề xuất**:
- Thêm visual preview của aspect ratio (khung placeholder)
- Hiển thị recommended aspect ratio cho từng channel rõ ràng hơn

### 2. Logic Issues

#### A. Retry Logic thiếu smart fallback
**Vấn đề hiện tại**:
```typescript
// useAutoImageGeneration.ts - Line 69-72
for (let attempt = 0; attempt <= maxRetries; attempt++) {
  // Simple exponential backoff: 1s, 2s, 4s
  const delay = 1000 * Math.pow(2, attempt);
}
```

**Giải pháp đề xuất**:
- Thêm model fallback: `gemini-3-pro-image-preview` → `gemini-2.5-flash-image`
- Thêm prompt simplification khi retry (rút gọn prompt phức tạp)
- Log chi tiết lý do fail để debug

#### B. Batch Processing Rate Limit
**Vấn đề hiện tại**:
```typescript
// Batch size = 2, delay = 1000ms
const batchSize = 2;
for (let i = 0; i < channels.length; i += batchSize) {
  await new Promise(resolve => setTimeout(resolve, 1000));
}
```

**Giải pháp đề xuất**:
- Dynamic batch size dựa trên số channels (1-3: sequential, 4+: batch of 2)
- Thêm queue system với priority (channels có nhiều text content → ưu tiên)
- Persist generation state để resume nếu tab bị đóng

#### C. Không có Image Quality Validation
**Vấn đề**: Ảnh generate có thể bị blank/white/low-quality nhưng vẫn được save

**Giải pháp đề xuất**:
- Thêm post-generation validation check (file size, dimensions)
- Thêm AI-based quality check (optional, dùng Gemini Flash để evaluate)
- Auto-regenerate nếu image fails validation

#### D. Logo Overlay Error Handling
**Vấn đề hiện tại**:
```typescript
// useAutoImageGeneration.ts - Line 116-121
if (overlayError || !overlayData?.success) {
  console.warn(`Logo overlay failed, using base image`);
  // Continues with base image - user not notified
}
```

**Giải pháp đề xuất**:
- Thông báo rõ cho user khi logo overlay fail
- Cho phép retry overlay riêng
- Thêm option "Try again with logo" trong preview

#### E. Channel-Specific Prompt Optimization
**Vấn đề**: Cùng một prompt cho tất cả channels, chỉ khác aspect ratio

**Giải pháp đề xuất** (đã có phần nào trong `image-prompt-builder.ts`):
- Tăng cường channel-specific visual direction
- TikTok: Vertical, bold text-safe areas
- Instagram: Grid-friendly composition
- LinkedIn: Professional, minimal, corporate aesthetic

### 3. Data/Storage Issues

#### A. Image History không có cleanup
**Vấn đề**: Database query cho thấy có images từ 20+ ngày trước vẫn tồn tại
```sql
SELECT AVG(EXTRACT(EPOCH FROM (NOW() - created_at))) 
-- Result: 1757335 seconds ≈ 20 days for some images
```

**Giải pháp đề xuất**:
- Scheduled cleanup cho images không được select trong 30 ngày
- Storage quota warning khi organization dùng quá nhiều
- Compression cho images cũ

#### B. Thiếu Image Versioning
**Vấn đề**: Khi regenerate, ảnh cũ bị thay thế hoặc thêm mới nhưng không có version number

**Giải pháp đề xuất**:
- Thêm `version` column vào `channel_image_history`
- UI hiển thị "Version 1", "Version 2" thay vì chỉ timestamp
- Compare mode để so sánh 2 versions

---

## Kế hoạch Thực hiện

### Phase 1: Quick Wins (UI Improvements)

| Tác vụ | File | Độ khó |
|--------|------|--------|
| Thêm Prompt Preview section | `ImagePromptEditor.tsx` | Thấp |
| Thêm Aspect Ratio visual preview | `AutoImageGenerator.tsx` | Thấp |
| Hiển thị estimated time | `ImageStreamingCard.tsx` | Thấp |
| Thông báo khi logo overlay fail | `useAutoImageGeneration.ts` | Thấp |

### Phase 2: Logic Enhancements

| Tác vụ | File | Độ khó |
|--------|------|--------|
| Smart retry với model fallback | `generate-brand-image/index.ts` | Trung bình |
| Image quality validation | `generate-brand-image/index.ts` | Trung bình |
| Dynamic batch size | `useAutoImageGeneration.ts` | Trung bình |
| Channel-specific prompts | `image-prompt-builder.ts` | Trung bình |

### Phase 3: Advanced Features

| Tác vụ | File | Độ khó |
|--------|------|--------|
| Unified Image Generator component | New component | Cao |
| Image versioning system | DB migration + UI | Cao |
| Generation queue with persistence | New hook | Cao |
| Automatic image cleanup job | Edge function | Trung bình |

---

## Recommended Priority

**Bắt đầu với Phase 1** vì:
1. Ít rủi ro, không thay đổi logic core
2. Cải thiện UX ngay lập tức
3. Dễ test và rollback

**Phase 2** sau khi Phase 1 stable:
1. Giảm failure rate
2. Tăng chất lượng output
3. Tối ưu performance

**Phase 3** cho long-term:
1. Scalability
2. User experience nâng cao
3. Cost optimization

---

## Technical Debt cần xử lý

1. **Type Consistency**: `Channel` type có mismatch giữa frontend và `image-prompt-builder.ts`
   - Frontend: 12 channels (bao gồm `email`, `google_maps`, `youtube`, `zalo_oa`, `telegram`)
   - Backend builder: 8 channels

2. **Duplicate Code**: `CHANNEL_IMAGE_CONFIG` trong `ImagePromptEditor.tsx` vs `CHANNEL_IMAGE_SPECS` trong `image-prompt-builder.ts`

3. **Missing Error Boundaries**: Không có error boundary cho image components, crash sẽ ảnh hưởng toàn bộ viewer

