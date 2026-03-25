

# Loại bỏ "Brief Assembly" khỏi Progress Bar của Creator Agent

## Phân tích hiện trạng

`assembleBrief()` trong `agent-creator-v2/index.ts` fetch nhẹ brand_name, tone, industry, personas (~50ms). Nhưng mỗi route downstream (multichannel, carousel, video_script) đều tự fetch đầy đủ brand template, products, personas, industry data. Brief chỉ phục vụ logging và self-review prompt — không đáng là một bước visible trên UI.

## Kế hoạch

### 1. Cập nhật progress steps cho Agent Creator

**File:** `src/components/agents/PipelineKanban.tsx` (hoặc nơi định nghĩa sub-steps)

- Loại bỏ bước "Brief Assembly" / "Tải ngữ cảnh thương hiệu" khỏi danh sách sub-steps hiển thị trên progress bar của stage `create`
- Giữ lại các bước thực tế có ý nghĩa theo từng content_type:

**Multichannel (4 bước):**
1. Tạo nội dung gốc (Core Content)
2. Chuyển đổi đa kênh (Channel Expansion)
3. Tạo ảnh song song (Image Generation)
4. Tự đánh giá (Self-Review)

**Carousel (4 bước):**
1. Tạo nội dung slides
2. Tạo prompt hình ảnh
3. Tạo ảnh từng slide
4. Tự đánh giá

**Video Script (3-4 bước):**
1. Tạo kịch bản
2. Chấm điểm
3. Cải thiện (nếu cần)
4. Tự đánh giá

### 2. Cập nhật backend progress events (nếu có SSE)

**File:** `supabase/functions/agent-creator-v2/index.ts`

- Không cần xóa `assembleBrief()` — nó vẫn hữu ích cho logging và self-review
- Chỉ đảm bảo không emit progress event cho bước này

### 3. Tạo mapping sub-steps theo content_type

**File mới hoặc mở rộng:** constants cho creator sub-steps

- Map `content_type` → danh sách sub-steps tương ứng
- UI progress bar đọc từ mapping này để render đúng số bước và label

## Kết quả

Progress bar sẽ chỉ hiển thị các bước **thực sự tốn thời gian và có ý nghĩa**, không còn bước "Brief Assembly" gây hiểu nhầm là một bước quan trọng.

