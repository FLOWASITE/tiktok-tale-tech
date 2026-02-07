

# Kế hoạch: Xóa bỏ "Chế độ chất lượng" khỏi bước Đa kênh

## Lý do

Tính năng "Chế độ chất lượng" (Quality Mode Selector) trong bước Đa kênh không cần thiết vì:

1. **Admin Panel đã cấu hình sẵn**: Trong `/admin/ai` > tab Channels, admin đã thiết lập:
   - Model mặc định cho từng channel
   - Quality Mode mặc định (Fast/Balanced/Quality) cho từng channel
   - Temperature, Hook Intensity, Prompt Style...

2. **Brand-level có thể override**: Mỗi Brand Template có thể override Quality Mode cho từng channel cụ thể

3. **Backend tự động điều chỉnh**: Hàm `getAutoBalancedQualityMode()` trong backend sẽ:
   - Tính điểm "Context Richness" dựa trên Brand/Persona/Research có sẵn
   - Tự động chọn mode phù hợp (ví dụ: nếu context giàu → dùng Fast, nếu context nghèo → dùng Balanced/Quality)
   - Điều chỉnh ngay cả khi user chọn mode không phù hợp

## Thay đổi cần thực hiện

### File: `src/components/multichannel/MultiChannelFormWizard.tsx`

**Xóa bỏ:**
1. Import `QualityModeQuickSelector` (dòng 83)
2. Component `<QualityModeQuickSelector>` trong Step 4 (dòng 1494-1502)

**Giữ nguyên:**
- `qualityMode` vẫn tồn tại trong `formData` nhưng sẽ dùng giá trị mặc định `'balanced'`
- Backend sẽ tự động điều chỉnh dựa trên context

### Không cần xóa file:
- `src/components/multichannel/QualityModeQuickSelector.tsx` - **Giữ lại** vì có thể dùng ở nơi khác (Brand Editor, Admin Panel)

## Kết quả

**Trước:**
```text
┌─────────────────────────────────────────┐
│ [Chọn kênh: Facebook, Instagram, ...]  │
├─────────────────────────────────────────┤
│ 🎚️ Chế độ chất lượng                    │  ← XÓA BỎ
│ ⚡ Nhanh  |  ⚖️ Cân bằng  |  ✨ Chất lượng│
├─────────────────────────────────────────┤
│ 💡 Gợi ý Opening Hook                   │
└─────────────────────────────────────────┘
```

**Sau:**
```text
┌─────────────────────────────────────────┐
│ [Chọn kênh: Facebook, Instagram, ...]  │
├─────────────────────────────────────────┤
│ 💡 Gợi ý Opening Hook                   │  ← Nổi bật hơn
└─────────────────────────────────────────┘
```

## Lợi ích

1. **UI gọn hơn** - Bớt 1 component, người dùng tập trung vào việc chọn kênh và hook
2. **Ít quyết định hơn** - Người dùng không cần hiểu về Quality Mode
3. **Tự động tối ưu** - Backend thông minh tự chọn mode phù hợp với context
4. **Quản trị tập trung** - Admin kiểm soát hoàn toàn qua AI Management

## File cần chỉnh sửa

| File | Thay đổi |
|------|----------|
| `src/components/multichannel/MultiChannelFormWizard.tsx` | Xóa import và component QualityModeQuickSelector |

