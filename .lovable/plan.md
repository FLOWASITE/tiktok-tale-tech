

# Gộp tab "Campaigns" và "Kế hoạch" thành một tab duy nhất

## Hiện trạng
- **Tab Campaigns**: Hiển thị danh sách các campaign (goals) với các nút hành động (chạy, pause, edit, xóa, xem pipeline)
- **Tab Kế hoạch**: Hiển thị `CampaignDashboard` — danh sách các kế hoạch nội dung (plans) và màn hình review chi tiết

Hai tab này có mối quan hệ chặt: mỗi campaign tạo ra kế hoạch → nên gộp lại cho gọn.

## Thiết kế

Gộp thành **1 tab "Campaigns"** với 2 phần:
1. **Phần trên**: Danh sách campaigns (goals) — giữ nguyên UI hiện tại nhưng thu gọn thành section có thể collapse
2. **Phần dưới**: `CampaignDashboard` (kế hoạch) — hiển thị ngay bên dưới

Hoặc dùng **sub-tabs** bên trong: "Danh sách Campaign" | "Kế hoạch nội dung"

## Thay đổi

### 1. `src/pages/AgentDashboard.tsx`
- Xóa tab "campaign-plans", chỉ giữ tab "campaigns"
- Trong `TabsContent value="campaigns"`: render cả danh sách goals và `CampaignDashboard` — dùng sub-tabs hoặc section layout
- Truyền props `autoSelectPlan` cho `CampaignDashboard` trong tab campaigns

### 2. Cập nhật label/icon
- Tab "Campaigns" giữ icon `Target`, đổi text nếu cần

Tổng: 1 file sửa (`AgentDashboard.tsx`), không thêm file mới.

