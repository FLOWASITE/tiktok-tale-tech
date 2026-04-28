# Hoàn thiện Tab Nội dung trong Báo cáo

## Hiện trạng

Tab Nội dung mới chỉ đọc `multi_channel_contents` và hiển thị:

- Bar chart theo channel
- List top brand
- Bảng tiêu đề (50 dòng)

Thiếu rất nhiều dữ liệu giá trị: scripts video, carousels, core_contents, ad_copies, trạng thái duyệt/publish, top topic, funnel chuyển đổi.

## Mục tiêu

Biến tab Nội dung thành tổng quan toàn diện về **mọi loại tài sản nội dung** workspace tạo trong khoảng thời gian, với insight có thể hành động (loại nào nhiều nhất, tỷ lệ approve, topic nào lặp lại).

## Phạm vi dữ liệu

Aggregate 5 nguồn (cùng filter `organization_id`, `brand_template_id`, `created_at` range):

- `multi_channel_contents` — multi-channel posts
- `scripts` — video scripts
- `carousels` — carousel slides
- `ad_copies` — ad copy variants

## Layout mới của Tab Nội dung

```text
┌─────────────────────────────────────────────────────────┐
│ [4 KPI cards]                                           │
│ Tổng nội dung │ Đã duyệt │ Đã publish │ Tỷ lệ duyệt    │
├─────────────────────────────────────────────────────────┤
│ [Stacked Bar: Theo loại × trạng thái]                   │
│  multichannel/script/carousel/core/ad_copy              │
│  draft / approved / published / partially_published     │
├──────────────────────────┬──────────────────────────────┤
│ Theo channel (bar)       │ Theo brand (list + bar)      │
├──────────────────────────┼──────────────────────────────┤
│ Top 10 topics (list)     │ Funnel: Tạo→Duyệt→Publish    │
├──────────────────────────┴──────────────────────────────┤
│ Bảng chi tiết (filter theo loại) — Loại │ Tiêu đề │     │
│ Brand │ Trạng thái │ Channels │ Ngày tạo │ →           │
└─────────────────────────────────────────────────────────┘
```

## Thay đổi kỹ thuật

### 1. `src/hooks/reports/useContentReport.ts` (rewrite)

Mở rộng `ContentReportData`:

```typescript
{
  total: number;
  byType: { type: 'multichannel'|'script'|'carousel'|'core'|'ad_copy'; count: number }[];
  byStatus: { status: string; count: number }[];
  byTypeStatus: { type: string; draft: number; approved: number; published: number; partially_published: number }[];
  byChannel: { channel: string; count: number }[];
  byBrand: { brand: string; count: number }[];
  byDay: { date: string; value: number }[];
  topTopics: { topic: string; count: number }[];        // NEW — group case-insensitive
  funnel: { created: number; approved: number; published: number };  // NEW
  rows: {
    id: string;
    type: 'multichannel'|'script'|'carousel'|'core'|'ad_copy';
    title: string;
    topic: string | null;
    status: string;
    channels: string[];
    brand_id: string | null;
    brand_name?: string;
    created_at: string;
  }[];
}
```

Thực hiện 5 query song song bằng `Promise.all`, mỗi loại trả về row chuẩn hóa kèm `type`. Mỗi query gắn filter `brand_template_id`/`channel` (channel chỉ áp dụng cho `multichannel`). Lấy brand_name một lần qua `.in('id', brandIds)`.

Funnel logic:

- `created` = total
- `approved` = status ∈ {approved, published, partially_published}
- `published` = status ∈ {published, partially_published}

Top topics: lowercase + trim, group, sort desc, limit 10.

### 2. `src/lib/reports/aggregators.ts`

Bổ sung helper `groupByTypeStatus(rows)` trả về dữ liệu cho stacked bar.

### 3. `src/components/reports/ContentTypeBadge.tsx` (new)

Badge nhỏ với màu/icon riêng cho mỗi loại (multichannel/script/carousel/core/ad_copy) — giữ Soft Luxury (neutral gray + accent nhẹ).

### 4. `src/pages/Reports.tsx` — rewrite `<TabsContent value="content">`

- Thêm 4 StatCard riêng cho tab.
- Stacked BarChart (recharts) cho byTypeStatus.
- Card "Top topics" + Card "Funnel" (3 step với % conversion).
- Bảng chi tiết: thêm cột Loại (ContentTypeBadge), cột Trạng thái (Badge), cột Brand. Click row → route đúng theo loại:
  - multichannel → `/multichannel/:id`
  - script → `/scripts/:id`
  - carousel → `/carousels/:id`
  - core → `/core-content/:id`
  - ad_copy → `/ad-copies/:id`
- Filter dropdown nhỏ phía trên bảng để lọc theo loại (all/multichannel/script/carousel/core/ad_copy).

### 5. `src/lib/reports/csvBuilder.ts` & `pdfBuilder.ts`

Cập nhật để CSV/PDF export tab Nội dung bao gồm cột mới (Loại, Trạng thái, Brand) và section Funnel + Top topics trong PDF.

## Lưu ý

- Giữ `limit(1000)` mỗi query (Supabase default cap) — đủ cho range thông thường; nếu vượt sẽ có notice nhỏ.
- Tôn trọng `currentOrganization.id` filter (multi-tenancy core rule).
- Không thay đổi schema, không cần migration.
- Dùng semantic tokens (`bg-primary`, `text-muted-foreground`), không raw colors.
- ChannelIcon SVG (không emoji) khi hiển thị channel.

## Files dự kiến

- **edited**: `src/hooks/reports/useContentReport.ts`
- **edited**: `src/pages/Reports.tsx`
- **edited**: `src/lib/reports/aggregators.ts`
- **edited**: `src/lib/reports/csvBuilder.ts`
- **edited**: `src/lib/reports/pdfBuilder.ts`
- **new**: `src/components/reports/ContentTypeBadge.tsx`