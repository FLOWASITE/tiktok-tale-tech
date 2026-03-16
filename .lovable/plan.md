
# Rà soát quản lý Cost -- Phát hiện và kế hoạch sửa

## Phát hiện từ dữ liệu thực tế

### 1. Thiếu user_id nghiêm trọng -- 85% records không có user_id
- **994 records** trong `ai_metrics`, chỉ **148** (15%) có `user_id`
- `topic-ai` (785 calls) không truyền `userId` vào metrics -> không thể tính cost per-user
- Chỉ `generate-multichannel` và `chat-topics` truyền userId đúng
- **Hậu quả**: Không thể tính chi phí per-user để inform pricing decisions

### 2. Nhiều function chưa thực sự ghi metrics (chỉ có code, chưa có data)
Mặc dù đã thêm `saveMetrics` vào ~20 functions, chỉ **7 functions** thực sự có data:
| Function | Records | Cost |
|----------|---------|------|
| topic-ai | 785 | $0.48 |
| generate-multichannel | 71 | $0.19 |
| generate-core-content | 62 | $0.04 |
| generate-hooks | 48 | $0.008 |
| chat-topics | 19 | $0.015 |
| generate-script | 6 | $0.004 |
| generate-brand-guideline | 3 | $0.002 |

-> Các function image (generate-brand-image, generate-carousel-image, etc.) chưa có record nào -- có thể do chưa được gọi hoặc code metrics lỗi. Cần verify.

### 3. Dashboard thiếu tính năng quan trọng
- **Không có Cost per User** -- cần nhất cho pricing decisions
- **Không có Cost per Organization** 
- **Không có alert/budget warning** khi chi phí vượt ngưỡng
- **Không có export data** cho báo cáo

### 4. Image generation cost estimation không chính xác
- Image models tính theo request, không theo tokens
- Hiện tại estimate `estimateTokens(prompt)` cho input, `0` cho output -- đánh giá thấp cost thực tế
- Cần tính cost per-image-request thay vì per-token

## Kế hoạch sửa

### Task 1: Fix user_id tracking cho tất cả functions
Cập nhật các function còn thiếu userId khi gọi `saveMetrics` / `callAIWithMetrics`:
- `topic-ai`, `generate-hooks`, `generate-core-content`, `generate-brand-guideline`
- Tất cả image functions, analyze functions, ad optimization functions
- Pattern: extract userId từ auth header hoặc body, truyền vào metrics

### Task 2: Thêm Cost per User section vào CostDashboard
- Thêm query group by `user_id` JOIN `profiles` lấy email/name
- Hiển thị bảng: User | Total Cost | Requests | Avg Cost/Request
- Giúp admin thấy user nào tốn nhiều cost nhất -> inform pricing

### Task 3: Thêm Cost per Organization
- Group by `organization_id` JOIN `organizations`
- Hiển thị tổng cost theo tổ chức

### Task 4: Fix image cost estimation
- Thay vì dùng token-based pricing cho image models, dùng per-request pricing
- Cập nhật `cost-estimator.ts` thêm `estimateImageCost(model)` trả về cost cố định per-request
- Google Imagen: ~$0.02-0.04/image, Gemini image: ~$0.01-0.02/image

### Task 5: Thêm Budget Alert + Export
- Card cảnh báo khi chi phí ngày/tuần vượt ngưỡng configurable
- Nút Export CSV cho cost data

## Phạm vi thay đổi
- ~10 edge functions: thêm userId vào metrics calls
- `supabase/functions/_shared/cost-estimator.ts`: thêm image pricing
- `src/hooks/useCostAnalytics.ts`: thêm queries per-user, per-org
- `src/components/admin/ai/CostDashboard.tsx`: thêm UI sections mới
- Không cần migration database (ai_metrics đã có `user_id`, `organization_id`)
