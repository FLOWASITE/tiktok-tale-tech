

# Sửa lỗi: AI Agent không tạo được bài viết

## Nguyên nhân gốc (đã xác nhận qua log và database)

Tìm thấy pipeline `b92c2b08` liên tục thất bại với lỗi:
> **"Content generation completed but all channels (facebook,blog) returned empty content"**

Database cho thấy `multi_channel_contents` được tạo nhưng `facebook_content = NULL`, `website_content = NULL`.

### 3 bug cùng gây ra lỗi:

**Bug 1: `target_channel` là chuỗi nối, không phải mảng (Nghiêm trọng)**
- Trong `campaign_content_plans.plan_data`, `target_channel` = `"facebook,blog"` (chuỗi)
- Code `create_from_plan` (dòng 587): `[piece.target_channel]` → tạo ra `["facebook,blog"]` (1 phần tử là chuỗi nối)
- `generate-multichannel` nhận kênh `"facebook,blog"` — không phải kênh hợp lệ → tạo record rỗng

**Bug 2: `blog` không được map sang `website` đúng cách**
- Dòng 587 dùng `.map(ch => ch === 'blog' ? 'website' : ch)` nhưng `ch` = `"facebook,blog"` nên không khớp
- Validation trong `agent-creator-v2` (dòng 466) kiểm tra `mcOutput['blog_content']` nhưng DB lưu là `website_content`

**Bug 3: Pipeline mất metadata sau recovery**
- `pipeline_state` hiện tại chỉ có `stages`, không có `metadata` (target_channels, campaign_context)
- `agent-pipeline` truyền `meta.target_channels || []` → rỗng → `agent-creator-v2` không biết kênh nào cần tạo

## Kế hoạch sửa

### 1. File `supabase/functions/agent-pipeline/index.ts` — `create_from_plan`
- **Tách `target_channel` thành mảng**: Thay `[piece.target_channel]` bằng `piece.target_channel.split(',').map(s => s.trim())`
- **Áp dụng `blog→website` mapping** sau khi tách

### 2. File `supabase/functions/agent-creator-v2/index.ts` — Validation
- **Normalize `blog` → `website`** trong `targetChannels` trước khi gọi `generate-multichannel`
- **Sửa validation** (dòng 466-469): khi kiểm tra content của kênh `blog`, tìm `website_content` thay vì `blog_content`

### 3. File `supabase/functions/agent-pipeline/index.ts` — `create` stage fallback
- Khi `meta.target_channels` rỗng, **fallback** lấy từ `pipeline.goal_id` → `agent_goals.target_channels`
- Hoặc parse từ `campaign_content_plans.plan_data` theo `piece_number`

### 4. Flag pipeline hiện tại đang kẹt
- Pipeline `b92c2b08` cần được flag vì metadata đã mất, không thể recover tự động

## Tổng: 2 file edge function + 1 cleanup query

