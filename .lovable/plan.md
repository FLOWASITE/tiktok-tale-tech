# Phân hệ Báo cáo (Workspace Reports)

Báo cáo cho user trong workspace, phủ 3 mảng: Content output, Publishing performance, Social Engagement. Có cron sync 6h, AI Insights tự động và Export PDF/CSV.

## 1. Tổng quan tính năng

**Route mới:** `/reports` (user) trong app, có sub-tabs:
- **Tổng quan** — KPI cards + biểu đồ tổng hợp
- **Nội dung** — đã tạo, theo channel/brand/campaign
- **Publishing** — đã đăng, success/fail, theo platform
- **Engagement** — reach/likes/comments/shares từ social
- **Quảng cáo** — aggregate từ ad_copy_performance (đã có sẵn)
- **AI Insights** — phân tích & gợi ý

**Filter toàn cục (sticky header):** Date range (default 30 ngày), Brand, Campaign, Channel/Platform.

**Export:** PDF có brand logo + CSV data thô — nút ngay góc phải header.

## 2. Dữ liệu nguồn (đã có trong DB)

| Mảng | Bảng | Ghi chú |
|---|---|---|
| Content | `multi_channel_contents`, `scripts`, `carousels`, `core_contents` | Group theo `created_at`, `channel`, `brand_template_id`, `campaign_id` |
| Publishing | `content_publishing_logs`, `publish_attempts` | Status: published/failed; group theo `channel` |
| Engagement | `social_post_engagements` | Đã có FB webhook; cần mở rộng sang IG/LinkedIn/TikTok/X |
| Ad | `ad_copy_performance` (+ auto-sync sẵn) | Aggregate cross-campaign |
| Usage/Cost | `usage_logs`, `ai_metrics` | Quota visualization |

## 3. Bảng mới cần tạo

### `social_post_metrics` — snapshot insights từ platform APIs
```
id, organization_id, brand_template_id, connection_id,
platform, post_id, content_id (nullable),
snapshot_at, reach, impressions, likes, comments, shares, saves,
video_views, link_clicks, raw jsonb,
unique(connection_id, post_id, snapshot_at::date)
```
RLS: org members read, service role insert/update.

### `report_sync_state` — track cron sync
```
id, organization_id, connection_id, platform,
last_synced_at, last_status, error_message, posts_synced
```

### `saved_reports` (V1.5, optional) — user lưu cấu hình filter
Bỏ qua nếu không cần V1.

## 4. Edge functions mới

### `sync-social-engagement` (cron 6h)
- Trigger qua pg_cron mỗi 6h
- Loop qua `social_connections` còn token hợp lệ
- Mỗi platform có module riêng (`fb.ts`, `ig.ts`, `linkedin.ts`, `tiktok.ts`, `x.ts`)
- Lấy posts trong 30 ngày gần nhất → fetch insights → upsert `social_post_metrics`
- Background persistence pattern (ghi DB ngay cả khi disconnect)
- Skip platform nếu token expired (đã có `refresh-*-token` xử lý song song)

### `generate-report-insights`
- Input: `{ date_range, brand_id?, campaign_id? }`
- Aggregate metrics từ DB → gửi vào Lovable AI Gateway (Gemini 2.5 Flash)
- Prompt tiếng Việt: phân tích trend, top channel, suggest action
- Cache kết quả 1h trong `ai_response_cache` (đã có infra)

### `export-report` (PDF + CSV)
- Input: `{ format: 'pdf'|'csv', filters, sections[] }`
- PDF: dùng pdf-lib (Deno) hoặc render server-side qua HTML→PDF với puppeteer-lite. Lựa chọn an toàn: tạo HTML có brand logo + chart SVG, dùng `@react-pdf/renderer` ở client (đơn giản hơn, không cần edge function). **Khuyến nghị: làm client-side trước với jsPDF + html2canvas** cho V1, server-side để V2.
- CSV: client-side blob download (đã có pattern trong `AdCopyAnalyticsDashboard`)

## 5. Frontend

### Cấu trúc file
```
src/pages/Reports.tsx                          # entry, sub-tabs
src/components/reports/
  ReportFilters.tsx                            # sticky header filter
  ReportExportMenu.tsx                         # PDF + CSV dropdown
  overview/OverviewSection.tsx
  overview/KPICards.tsx                        # 4-6 stat cards
  overview/TrendChart.tsx                      # area chart 30d
  content/ContentReport.tsx                    # by channel + brand
  publishing/PublishingReport.tsx              # success/fail funnel
  engagement/EngagementReport.tsx              # platform tabs + post table
  ads/AdsReport.tsx                            # reuse AdCopyAnalyticsDashboard pattern
  insights/AIInsightsReport.tsx                # cards + refresh
  shared/EmptyReportState.tsx
  shared/ReportSkeleton.tsx
src/hooks/reports/
  useReportFilters.ts                          # url-state + brand/campaign awareness
  useContentReport.ts
  usePublishingReport.ts
  useEngagementReport.ts
  useReportInsights.ts
  useReportExport.ts
src/lib/reports/
  aggregators.ts                               # group/sum helpers
  pdfBuilder.ts                                # client PDF generation
  csvBuilder.ts
```

### Navigation
- Thêm menu item "Báo cáo" (icon `BarChart3`) vào sidebar chính, sau "Campaigns"
- Bảo vệ bằng `<ProtectedRoute>` + `<AppLayout>`
- Filter respect `currentOrganization.id` + `BrandContext` (theo Core memory: strict UI filtering)

### Visual
- Tuân Soft Luxury: neutral gray accents, no emoji, dùng `ChannelIcon` SVG cho platform
- Reuse `recharts` (đã có), chart cards dùng same style như `CampaignAnalyticsDashboard`
- Loading: skeleton; Empty: friendly CTA (vd "Chưa có post nào — bắt đầu xuất bản")

## 6. Cron setup

```sql
SELECT cron.schedule(
  'sync-social-engagement-6h',
  '0 */6 * * *',
  $$ SELECT net.http_post(
    url:='https://rllyipiyuptkibqinotz.supabase.co/functions/v1/sync-social-engagement',
    headers:='{"Content-Type":"application/json","apikey":"<ANON>"}'::jsonb,
    body:='{}'::jsonb
  ); $$
);
```
(Chạy bằng insert tool sau khi function deploy.)

## 7. Phân pha triển khai

**Phase 1 (V1 — core):**
1. Migration: tạo `social_post_metrics`, `report_sync_state` + RLS
2. Trang `/reports` + tab Tổng quan + tab Nội dung + tab Publishing (chỉ DB nội bộ)
3. Filter + Export CSV
4. Sidebar entry

**Phase 2 (V1.1 — engagement):**
5. Edge function `sync-social-engagement` (FB + IG trước, LinkedIn/TikTok/X sau)
6. Cron 6h
7. Tab Engagement + tab Ads (reuse component)

**Phase 3 (V1.2 — AI + PDF):**
8. Edge function `generate-report-insights` + AI Insights tab
9. Export PDF (client-side jsPDF)
10. i18n strings (vi/en/th)

## 8. Rủi ro & lưu ý

- **API quota từng platform:** sync 6h × số connection có thể hit limit IG/LinkedIn. Mitigate: rate-limit per platform, skip nếu fail liên tiếp 3 lần
- **Token expired:** đã có `automated-token-refresh-system` chạy 30min, sync function chỉ skip + log
- **PDF performance:** client-side jsPDF OK với <50 charts. Nếu nặng, chuyển server-side V2
- **AI Insights cost:** cache 1h + chỉ regenerate khi user bấm refresh
- **Không vi phạm RLS:** tất cả query filter `organization_id = currentOrganization.id` ở cả frontend + DB

## 9. Câu hỏi mở (có thể quyết khi build)

- Tab Ads: reuse `AdCopyAnalyticsDashboard` thẳng hay wrap lại với filter chung? → Khuyến nghị wrap để đồng nhất filter
- AI Insights nên auto-generate khi vào trang hay chỉ khi user bấm? → Auto-load (cache 1h) + nút refresh
- Báo cáo per-brand hay per-workspace? → Per-workspace, brand là filter optional
