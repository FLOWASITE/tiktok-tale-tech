

# Làm lại UI trang /blog

## Phân tích hiện tại

Trang `/blog` hiện có layout cơ bản với featured post + grid 3 cột. Tuy nhiên thiếu sự tinh tế theo design system "Soft Luxury" của project và có một số vấn đề:
- Hero section quá lớn, gradient màu rực rỡ không phù hợp soft luxury
- Featured post card chưa tinh tế
- Grid cards thiếu chiều sâu
- Footer đơn giản, không dùng chung component
- Thiếu category filter/tabs
- CTA section gradient quá sặc sỡ

## Thiết kế mới

### Layout tổng quan

```text
┌─────────────────────────────────────┐
│  LandingNav                         │
├─────────────────────────────────────┤
│  Breadcrumb                         │
├─────────────────────────────────────┤
│  Hero: Minimal title + subtitle     │
│  Category filter tabs               │
├─────────────────────────────────────┤
│  Featured Post (full-width card)    │
│  ┌──────────┬──────────────────┐    │
│  │  Image   │  Title, excerpt  │    │
│  │          │  metadata, CTA   │    │
│  └──────────┴──────────────────┘    │
├─────────────────────────────────────┤
│  Grid 3 cols (post cards)           │
│  ┌────┐ ┌────┐ ┌────┐              │
│  │    │ │    │ │    │              │
│  └────┘ └────┘ └────┘              │
├─────────────────────────────────────┤
│  Pagination                         │
├─────────────────────────────────────┤
│  CTA: Monochrome, subtle           │
├─────────────────────────────────────┤
│  Footer                             │
└─────────────────────────────────────┘
```

### Thay đổi chi tiết

1. **Hero section** — Thu gọn, loại bỏ gradient rực rỡ. Tiêu đề đơn giản, monochromatic. Thêm category filter tabs (All, Product, Strategy, AI, Guide).

2. **Featured post** — Giữ layout 2 cột nhưng tinh chỉnh: border mỏng hơn, shadow subtle, hover effect nhẹ nhàng hơn. Loại bỏ gradient overlay trên ảnh.

3. **Post cards** — Thiết kế lại với: ảnh cover có aspect-ratio 16/9, hover lift effect nhẹ, category tag nhỏ phía trên title, metadata dùng separator dot thay vì icon.

4. **CTA section** — Chuyển sang monochromatic: background `bg-muted/30`, border subtle, không dùng gradient nhiều màu.

5. **Category filtering** — Thêm tabs/pills filter theo category, filter client-side từ danh sách posts đã fetch.

6. **Search** — Thêm ô search đơn giản filter theo title.

## Technical details

- Thêm state `selectedCategory` và `searchQuery` để filter posts
- Category list được extract tự động từ posts data
- Filter áp dụng trước pagination
- Giữ nguyên data fetching logic (DB + static fallback)

## Files thay đổi

- **Edit**: `src/landing/pages/Blog.tsx` — Làm lại toàn bộ UI: hero, cards, filter, CTA

