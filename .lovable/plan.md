

# Kế hoạch nâng cấp GEO Engine — 3 giai đoạn

---

## Giai đoạn 1: Fix lỗ hổng & kết nối data flow

### 1A. Fix constraint xung đột `geo_action_tasks`
- Migration: Thay đổi DEFAULT status từ `'open'` sang `'pending'` (vì `'open'` không nằm trong CHECK constraint)
- Đảm bảo constraint cho phép: `pending, in_progress, content_generated, published, measuring, resolved, done`

### 1B. Tự động tạo tasks từ scan results
- Cập nhật `geo-scan-brand` edge function: sau khi insert results, phân tích kết quả → auto-insert tasks vào `geo_action_tasks`:
  - SOV < 20% → task "Tăng brand visibility" (priority: strategic)
  - Sentiment < -20 → task "Cải thiện sentiment" (priority: quick_win)
  - Citation rate = 0 → task "Thêm citation signals" (priority: optimization)
  - Competitor SOV cao hơn → task cụ thể theo competitor
- Mỗi scan chỉ tạo tasks mới nếu chưa có task pending/in_progress cùng loại

### 1C. Kết nối `geo_alert_history` 
- Cập nhật `geo-scan-brand`: sau scan, so sánh snapshot hiện tại vs snapshot trước → insert alerts vào `geo_alert_history` khi có thay đổi đáng kể (SOV ±10%, sentiment drop > 15)
- Cập nhật `VisibilityAlerts.tsx`: đọc từ `geo_alert_history` table thay vì tính toán từ results props

### 1D. Xóa table `geo_prompt_clusters` không dùng
- Migration: DROP TABLE nếu không có data, hoặc tạo logic mapping từ `geo_prompts` → clusters

---

## Giai đoạn 2: Nâng cấp scan engine — API thật

### 2A. Perplexity API (đã có key sẵn)
- Cập nhật `geo-scan-brand`: khi engine = `perplexity`, gọi trực tiếp `https://api.perplexity.ai/chat/completions` với `PERPLEXITY_API_KEY`
- Parse response thật: Perplexity trả về citations rõ ràng trong field `citations[]`
- Model: `sonar` hoặc `sonar-pro`

### 2B. ChatGPT & Gemini — giữ simulated nhưng cải thiện
- OpenAI API cần API key riêng → hỏi user có muốn thêm OPENAI_API_KEY không
- Gemini: có thể dùng Lovable AI Gateway (đã có) nhưng cải thiện system prompt để parse chính xác hơn
- Đánh dấu rõ trong `geo_monitoring_results`: thêm field `is_simulated BOOLEAN` để phân biệt kết quả thật vs giả lập

### 2C. Cost tracking chính xác
- Perplexity: tính cost từ actual token usage trong response
- Simulated engines: giữ estimated cost hiện tại
- Cập nhật scan job với actual cost breakdown theo engine

---

## Giai đoạn 3: Hoàn thiện UI/UX

### 3A. Trend charts từ snapshots
- Tạo component `TrendChart.tsx`: LineChart hiển thị SOV%, citation rate, sentiment theo thời gian từ `geo_visibility_snapshots`
- Thêm vào `GEOOverview.tsx` thay thế hoặc bổ sung bên cạnh charts hiện tại
- Hỗ trợ filter theo 7/14/30/90 ngày

### 3B. Alert History UI
- Tạo component `AlertHistory.tsx`: danh sách alerts từ `geo_alert_history` với badge severity, mark as read
- Thêm notification dot trên tab Overview khi có alerts chưa đọc

### 3C. Action Center nâng cấp
- Thêm nút "Tạo task thủ công" vào `ActionCenter.tsx`
- Hiển thị source context: link đến scan result hoặc GEO score issue gốc
- Filter theo source_module (monitor/optimizer/competitor)

### 3D. Overview dashboard cải tiến
- Thêm mini sparkline cho mỗi KPI card (trend 7 ngày gần nhất từ snapshots)
- Hiển thị last scan time + next scheduled scan
- Badge "Real" vs "Simulated" cho engine results

---

## Thứ tự triển khai

| Bước | Nội dung | Files chính |
|------|----------|-------------|
| 1 | Migration fix constraint + thêm `is_simulated` | migration SQL |
| 2 | `geo-scan-brand` — auto tasks + alerts + Perplexity real API | edge function |
| 3 | `VisibilityAlerts.tsx` — đọc từ `geo_alert_history` | component |
| 4 | `TrendChart.tsx` + tích hợp vào Overview | component mới |
| 5 | `AlertHistory.tsx` | component mới |
| 6 | `ActionCenter.tsx` — nút tạo task + filter | component |
| 7 | Overview KPI sparklines | component update |

