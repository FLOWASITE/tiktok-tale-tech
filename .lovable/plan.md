

# Rà soát task chưa thực hiện theo kế hoạch 3 giai đoạn

## Đã hoàn thành ✓

| Task | Trạng thái |
|------|-----------|
| 1A. Fix constraint `geo_action_tasks` DEFAULT → `'pending'` | ✓ Migration đã tạo |
| 1B. Tự động tạo tasks từ scan results | ✓ `autoGenerateTasks()` trong `geo-scan-brand` |
| 1C. Kết nối `geo_alert_history` — scan ghi alerts | ✓ `autoGenerateAlerts()` trong `geo-scan-brand` |
| 1C. `VisibilityAlerts.tsx` đọc từ DB | ✓ Đã chuyển sang query `geo_alert_history` |
| 2A. Perplexity API thật | ✓ Đã tích hợp trong `geo-scan-brand` |
| 2B. `is_simulated` field | ✓ Migration + logic phân biệt |
| 2C. Cost tracking | ✓ Token-based cho Perplexity, estimated cho simulated |
| 3A. TrendChart từ snapshots | ✓ `TrendChart.tsx` với filter 7/14/30/90 ngày |
| 3B. AlertHistory UI | ✓ `AlertHistory.tsx` với mark as read |
| 3C. Action Center — tạo task thủ công + filter source_module | ✓ Dialog + source filter |
| 3D. Badge "Real" vs "Simulated" | ✓ Hiển thị trên Overview |
| 3D. Last scan time + cost | ✓ Hiển thị trên Overview |

## Chưa hoàn thành ✗

| # | Task | Chi tiết |
|---|------|---------|
| 1 | **1D. Xóa table `geo_prompt_clusters`** | Table vẫn tồn tại trong DB, không có code nào sử dụng. Cần migration DROP TABLE. |
| 2 | **3B. Notification dot trên tab Overview** | Kế hoạch ghi "notification dot khi có alerts chưa đọc" nhưng `GEODashboard.tsx` tab không có indicator nào. |
| 3 | **3D. Mini sparkline cho KPI cards** | 4 KPI cards (SOV, Citation Rate, Sentiment, Total Scans) chỉ hiển thị số, chưa có sparkline trend 7 ngày. Không tìm thấy bất kỳ code sparkline nào. |
| 4 | **3D. Next scheduled scan** | Overview chỉ hiện last scan cost, chưa hiển thị "next scheduled scan" time. |
| 5 | **3C. Source context link** | Action Center chưa hiển thị link đến scan result hoặc GEO score issue gốc cho mỗi task. |

---

## Kế hoạch triển khai 5 task còn lại

### 1. Migration: Drop `geo_prompt_clusters`
- Một migration đơn giản: `DROP TABLE IF EXISTS public.geo_prompt_clusters;`

### 2. Notification dot trên tab "Tổng quan"
- Query count unread alerts từ `geo_alert_history` trong `GEODashboard.tsx`
- Hiển thị dot đỏ nhỏ trên TabsTrigger "Tổng quan" khi count > 0

### 3. Mini sparklines cho 4 KPI cards
- Fetch 7 ngày gần nhất từ `geo_visibility_snapshots` trong `GEOOverview.tsx`
- Dùng Recharts `<Sparkline>` (LineChart nhỏ, không axis) trong mỗi card
- SOV → sparkline sov_percentage, Citation → citation_rate, Sentiment → avg_sentiment, Scans → total_scans

### 4. Next scheduled scan
- Tính từ `last_scanned_at` + `scan_frequency` của monitor
- Hiển thị text "Next scan: ..." bên cạnh last scan cost

### 5. Source context link trong Action Center
- Hiển thị badge `source_module` (monitor/optimizer/competitor) trên mỗi task card
- Nếu task có `content_id`, thêm link/button dẫn đến content tương ứng

### Files cần sửa
- Migration SQL mới (drop `geo_prompt_clusters`)
- `src/pages/GEODashboard.tsx` (notification dot)
- `src/components/geo/GEOOverview.tsx` (sparklines + next scan)
- `src/components/geo/ActionCenter.tsx` (source context link)

