# Thay QuotaWarningIndicator bằng thanh ProgressBar trung bình

## Ý tưởng

Thay thế text cảnh báo "Scripts 80% — Sắp hết" trong sidebar bằng một **thanh progress nhỏ** hiển thị **phần trăm trung bình** của tất cả quota (bỏ qua unlimited). Kèm text ngắn gọn như "Quota: 65%".

## Thay đổi

### `src/components/AppSidebar.tsx` — Viết lại `QuotaWarningIndicator`

**Logic tính trung bình:**

```text
checks = [scripts, carousels, multichannel, images, brands]
→ lọc bỏ unlimited (limit === -1)
→ avgPct = trung bình (used / limit * 100) của các mục còn lại
```

**UI mới:**

- Thanh progress nhỏ (h-1.5) với màu theo mức: xanh (<70%), vàng (70-89%), đỏ (≥90%)
- Text: `"Quota: {avgPct}%"` bên trái, plan label bên phải
- Có chu kỳ : số ngày còn lại bên dưới
- Click vào → navigate `/account`
- Khi chưa có subscription → hiện tagline "One Flow. All Content." như cũ

## File thay đổi (1)


| File                            | Thay đổi                                                              |
| ------------------------------- | --------------------------------------------------------------------- |
| `src/components/AppSidebar.tsx` | Viết lại `QuotaWarningIndicator` dùng progress bar thay vì badge text |
