

# Nâng cấp MockupScoreBar — hiển thị chỉ số rõ ràng, chi tiết hơn

## Vấn đề hiện tại
- Score bar chỉ hiển thị 3 badge nhỏ (11px) trên 1 dòng — rất khó đọc
- Thiếu label mô tả cho mỗi chỉ số (chỉ có icon + số)
- `engagementScore` không được truyền từ `MultiChannelViewer`
- Không có progress bar trực quan cho từng chỉ số

## Giải pháp

### 1. Redesign `MockupScoreBar.tsx` — layout chi tiết hơn
- Chuyển từ 1 dòng badges sang **grid 3 cột**, mỗi cột 1 chỉ số
- Mỗi chỉ số gồm: **label text** (Chất lượng / GEO / Tương tác), **score lớn hơn** (text-sm font-bold), **mini progress bar** màu theo mức điểm
- Kích thước text tăng từ 11px lên 12-13px, score number 14px
- Thêm prop `readabilityScore` và `sentimentScore` từ Content Analytics (nếu có)

### 2. Truyền thêm data từ `MultiChannelViewer.tsx`
- Tính `engagementScore` từ content text (dùng logic đã có trong ContentAnalyticsPanel)
- Truyền xuống `ContentMockupToggle` → `MockupScoreBar`

### 3. Cập nhật `ContentMockupToggle.tsx`
- Thêm props mới để forward xuống MockupScoreBar

### Files cần sửa
- `src/components/preview/MockupScoreBar.tsx` — redesign layout chi tiết
- `src/components/viewer/ContentMockupToggle.tsx` — forward thêm props
- `src/components/MultiChannelViewer.tsx` — tính và truyền engagementScore

