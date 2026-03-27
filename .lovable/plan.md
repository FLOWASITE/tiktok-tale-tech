

# Hoàn thiện UI bước xác nhận khi tạo mới Campaign AI

## Hiện trạng

Dialog xác nhận hiện tại (line 1088-1108 trong `CampaignCreate.tsx`) chỉ là `AlertDialog` đơn giản với 1 dòng title + 1 dòng description text. Không hiển thị tổng quan dữ liệu campaign để user review trước khi submit.

Trong khi đó, `CampaignCreatePreviewPanel` đã có layout tổng quan đầy đủ nhưng chỉ hiển thị ở sidebar (desktop only, hidden on mobile).

## Thay đổi

### 1. Tạo component `CampaignConfirmDialog.tsx`

Thay thế `AlertDialog` đơn giản bằng một `Dialog` đầy đủ hiển thị tổng quan campaign theo phong cách Soft Luxury:

- **Header**: Icon + title động (Tạo mới / Cập nhật)
- **Summary sections** (compact, monochromatic):
  - Tên + Loại chiến dịch (badge)
  - Thời gian (start → end, duration)
  - Key Messages + CTA (badges)
  - KPIs có target > 0 (danh sách metric → target)
  - Ngân sách
  - Kênh phân phối (ChannelIcon với brand colors)
  - Milestones count
- **Completeness score** (Progress bar + %)
- **Warnings** nếu thiếu thông tin quan trọng (vàng, icon AlertCircle)
- **Ready indicator** khi đủ điều kiện (xanh, icon CheckCircle)
- **Footer**: Nút Hủy + Xác nhận (với loading state)

### 2. Cập nhật `CampaignCreate.tsx`

- Import component mới
- Thay block `AlertDialog` submit confirm (line 1088-1108) bằng `CampaignConfirmDialog`
- Truyền props: `formData`, `milestones`, `isEditMode`, `isSubmitting`, `onConfirm`, `open/onOpenChange`

## File thay đổi

- **Tạo**: `src/components/campaign/CampaignConfirmDialog.tsx`
- **Sửa**: `src/pages/CampaignCreate.tsx` — thay AlertDialog confirm bằng component mới

