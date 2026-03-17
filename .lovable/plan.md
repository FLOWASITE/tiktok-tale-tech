

# Kế hoạch: Thống kê toàn hệ thống cho Admin (flowasite@gmail.com)

## Hiện trạng

Admin Dashboard hiện tại (`/admin/dashboard`) chỉ hiện số liệu tĩnh đơn giản: đếm tổng users, subscriptions, brands, scripts, carousels, multi-channel, industry templates. Không có **thống kê theo thời gian**, **xu hướng tăng trưởng**, hay **phân tích chi tiết hoạt động** của toàn hệ thống.

Đã có sẵn:
- **AI Cost Dashboard** (`/admin/ai` tab Costs) — chi phí AI theo model/user/org
- **WorkspaceUsageStats** — thống kê theo user/brand trong 1 workspace
- **Bảng dữ liệu**: `multi_channel_contents`, `channel_image_history`, `scripts`, `carousels`, `usage_logs`, `ai_metrics`, `content_schedules`, `social_connections`, `profiles`, `subscriptions`, `organizations`, `organization_members`

## Kế hoạch triển khai

### 1. Trang mới: `/admin/analytics` — Admin System Analytics

Tạo trang `AdminAnalytics.tsx` với các section sau:

#### Section A: Tổng quan theo thời gian (Time-series Overview)
- **Bộ lọc**: Chọn khoảng thời gian (7 ngày / 30 ngày / 90 ngày / Tháng này / Tháng trước)
- **4 KPI cards** với so sánh % thay đổi so với kỳ trước:
  - Tổng nội dung tạo mới (multi_channel_contents)
  - Tổng bài Social (sum selected_channels)
  - Tổng ảnh AI (channel_image_history)
  - Tổng user mới đăng ký (profiles)
- **Line chart**: Xu hướng tạo nội dung theo ngày (nội dung + ảnh AI)

#### Section B: Thống kê theo Organization
- **Bảng xếp hạng Organization**: Sort theo tổng hoạt động giảm dần
  - Tên org | Số thành viên | Nội dung đa kênh | Bài Social | Ảnh AI | Plan
- Có thể click vào org để xem chi tiết (link tới `/admin/organizations`)

#### Section C: Thống kê theo User (Top Users)
- **Bảng xếp hạng User**: Top 20 user hoạt động nhiều nhất trong kỳ
  - Avatar | Tên | Email | Org | Nội dung | Bài Social | Ảnh AI | AI Edits
- Export CSV

#### Section D: Phân bổ theo kênh (Channel Distribution)
- **Pie/Bar chart**: Phân bổ bài Social theo từng channel (Facebook, Instagram, TikTok, Twitter, Threads, Zalo, Website...)
- **Pie/Bar chart**: Phân bổ ảnh AI theo channel

#### Section E: Tăng trưởng hệ thống (System Growth)
- **Stacked area chart**: User mới đăng ký theo ngày/tuần
- **Bar chart**: Subscription distribution over time (free/starter/pro/enterprise)
- **Số liệu**: Tổng organizations, active organizations (có hoạt động trong 30 ngày)

#### Section F: AI Usage Summary (tóm tắt từ ai_metrics)
- Tổng requests AI, tổng chi phí, chi phí trung bình/request
- Top 5 models được dùng nhiều nhất
- Link sang `/admin/ai` để xem chi tiết

### 2. Thay đổi code

**Files mới:**
- `src/pages/AdminAnalytics.tsx` — Trang chính, layout các section
- `src/hooks/useAdminSystemAnalytics.ts` — Hook fetch + aggregate dữ liệu từ các bảng

**Files sửa:**
- `src/App.tsx` — Thêm route `/admin/analytics`
- `src/pages/AdminDashboard.tsx` — Thêm link/card "System Analytics" vào Quick Actions và header

### 3. Truy vấn dữ liệu

Tất cả query sẽ chạy client-side với admin RLS policies đã có sẵn (`has_role`). Các bảng chính:

```text
multi_channel_contents  → count, selected_channels, user_id, organization_id, created_at
channel_image_history   → count, channel, content_id
scripts                 → count by user_id, created_at
carousels               → count by user_id, created_at
usage_logs              → count ai_edit by user_id
ai_metrics              → estimated_cost_usd, model, function_name
profiles                → id, email, full_name, avatar_url, created_at
organizations           → id, name
organization_members    → organization_id, user_id, role
subscriptions           → user_id, plan_type, status
```

### 4. Không cần migration

Tất cả dữ liệu đã có sẵn. Admin đã có RLS policies cho phép đọc toàn bộ bảng.

### Ước lượng

- `useAdminSystemAnalytics.ts`: ~200 dòng (hook với nhiều parallel queries)
- `AdminAnalytics.tsx`: ~400 dòng (6 sections với charts)
- Sửa `App.tsx`: +10 dòng (route)
- Sửa `AdminDashboard.tsx`: +5 dòng (link)

Tổng: ~615 dòng code mới, 2 files sửa nhỏ.

