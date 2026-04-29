# Bổ sung Báo cáo Gói đăng ký — Breakdown theo Brand & User

Thêm 2 panel mới vào tab **Gói đăng ký** (`SubscriptionReportTab`) cho phép xem brand nào và thành viên nào tiêu thụ quota nhiều nhất trong chu kỳ hiện tại.

## Phạm vi

- Áp dụng cho 4 loại quota: Scripts, Carousels, Đa kênh, Ảnh AI
- Khoảng thời gian: chu kỳ subscription hiện tại (tái dùng `currentPeriod` từ `useSubscription`)
- Không cần export

## Thay đổi kỹ thuật

### 1. Mở rộng `useSubscriptionReport.ts`

Thêm 2 query mới chạy song song với `dailyQuery`:

**Brand breakdown** — group theo `brand_template_id`:
- Query `scripts`, `carousels`, `multi_channel_contents` (lọc `organization_id` + period)
- Với ảnh: lấy `content_id` từ `multi_channel_contents` rồi join `channel_image_history` (chunk 100 như hiện tại) để map ngược về brand
- Lookup tên brand qua `brand_templates` (1 query batch theo `id IN (...)`)
- Output: `Array<{ brandId, brandName, scripts, carousels, multichannel, images, total }>`

**User breakdown** — group theo `user_id` / `created_by`:
- 3 bảng content dùng `user_id`, `channel_image_history` dùng `created_by`
- Lookup tên user qua `profiles` (`id, full_name, email, avatar_url`) batch
- Output: `Array<{ userId, fullName, email, avatarUrl, scripts, carousels, multichannel, images, total }>`

Cả hai đều sort theo `total` desc, hiển thị top 10.

### 2. Component UI mới

Thêm 2 Card vào `SubscriptionReportTab.tsx`, đặt sau "Top kênh tiêu thụ Ảnh AI" và trước "Addon đang hoạt động":

```text
┌─────────────────────────────────┬─────────────────────────────────┐
│ Tiêu thụ theo Brand             │ Tiêu thụ theo Thành viên        │
│ ┌──────────────────────────────┐│ ┌──────────────────────────────┐│
│ │ Brand A    ▓▓▓▓▓▓▓▓▓░  142  ││ │ ◯ Nguyễn Văn A ▓▓▓▓▓▓░  87  ││
│ │ Brand B    ▓▓▓▓▓▓░░░░   78  ││ │ ◯ Trần Thị B   ▓▓▓▓░░░  52  ││
│ │ Brand C    ▓▓▓░░░░░░░   31  ││ │ ◯ Lê Văn C     ▓▓░░░░░  18  ││
│ └──────────────────────────────┘│ └──────────────────────────────┘│
└─────────────────────────────────┴─────────────────────────────────┘
```

Mỗi dòng:
- Tên (brand hoặc user + avatar)
- Thanh progress bar (% so với top 1)
- Tổng tiêu thụ + tooltip breakdown 4 loại (scripts/carousels/đa kênh/ảnh)

Layout: `grid grid-cols-1 lg:grid-cols-2 gap-3`. Empty state khi không có data.

### 3. Tooltip chi tiết

Hover vào 1 dòng → tooltip hiển thị 4 con số cụ thể:
- Scripts: X
- Carousels: Y
- Đa kênh: Z
- Ảnh AI: W

## Files

- **Updated**: `src/hooks/reports/useSubscriptionReport.ts` (thêm 2 queries + types `BrandUsageRow`, `UserUsageRow`)
- **Updated**: `src/components/reports/SubscriptionReportTab.tsx` (thêm 2 Card breakdown)

## Lưu ý

- Tái dùng pattern chunk 100 ids đã có cho ảnh để tránh URL length limit
- Chỉ count rows, không cần aggregate phức tạp ở DB → giữ ở client như phần daily series
- Không thay đổi DB schema, không cần migration
