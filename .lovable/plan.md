

## Hiển thị quy trình 4 bước tạo content trong Chat UI

### Mục tiêu
Khi Agent tạo nội dung đa kênh qua chat, UI sẽ hiển thị rõ ràng kết quả từng bước của quy trình: Topic -> Core Content -> Vai trò -> Đa kênh, thay vì chỉ show badge kênh và preview ngắn như hiện tại.

### Hiện trạng
- Tool `generate_multichannel` đã trả về đầy đủ dữ liệu: `pipeline_steps`, `core_content_id`, `content_goal`, `content_angle`, `content_role`, `journey_stage`, `channel_previews`, `channels`
- Component `MultichannelResult` trong `ToolResultCard.tsx` chỉ hiển thị message + channel badges + 2 dòng preview
- Pipeline Bar (`AgentPipelineBar`) hiển thị progress các Agent nodes (research, content, reviewer...) nhưng không hiển thị bước nội bộ của content pipeline

### Thay đổi

#### 1. Tạo component `ContentPipelineSteps` (file mới)
`src/components/topic/chatbot/ContentPipelineSteps.tsx`

Component hiển thị 4 bước dạng vertical timeline với trạng thái hoàn thành:

```text
Step 1: Topic & Goal
  [Education badge] "Cách tối ưu SEO cho website thương mại điện tử"

Step 2: Core Content  
  [Core Content ID link] | Quality Score | Word count

Step 3: Vai trò chiến lược
  [Seed/Sprout/Harvest badge] + mô tả ngắn

Step 4: Đa kênh (N kênh)
  [FB] [IG] [TikTok] badges + preview thu gọn
```

Mỗi bước hiển thị icon check (completed), thông tin tham số đã sử dụng, và có thể thu gọn/mở rộng (Collapsible).

#### 2. Cập nhật `MultichannelResult` trong `ToolResultCard.tsx`
Thay thế giao diện hiện tại (chỉ badges + preview) bằng `ContentPipelineSteps` khi tool result có `pipeline_steps` (tức là đi qua pipeline 2 bước). Giữ nguyên UI cũ cho trường hợp fallback (không có core content).

#### 3. Thêm sub-step SSE events chi tiết hơn cho Content Node
Cập nhật `content-node.ts` để emit thêm progress events cho từng bước nội bộ:
- `core_content_generating` → "Đang tạo Core Content..."
- `role_assigned` → "Vai trò: Seed/Sprout/Harvest"  
- `transforming_channels` → "Đang chuyển đổi sang N kênh..."

Điều này giúp `ChatThinkingIndicator` hiển thị sub-label chính xác hơn khi content node đang active.

### Chi tiết kỹ thuật

**Files mới:**
- `src/components/topic/chatbot/ContentPipelineSteps.tsx` — Component timeline 4 bước

**Files cần sửa:**
- `src/components/topic/chatbot/ToolResultCard.tsx` — Tích hợp `ContentPipelineSteps` vào `MultichannelResult`
- `supabase/functions/_shared/graph/nodes/content-node.ts` — Thêm granular progress events
- `supabase/functions/_shared/tool-executor.ts` — Bổ sung thêm metadata vào tool result (goal label, role label, angle label) để UI render đúng tiếng Việt

**Dữ liệu có sẵn từ tool result (không cần thay đổi schema):**
- `content_goal`, `content_angle`, `content_role`, `journey_stage`
- `core_content_id`, `pipeline_steps`
- `channels`, `channel_previews`
- `topic`

**Component ContentPipelineSteps — cấu trúc:**

```text
+------------------------------------------+
| Quy trình tạo nội dung                   |
+------------------------------------------+
| [check] Bước 1: Chủ đề & Mục tiêu       |
|   Goal: [Education badge]                |
|   Topic: "Cách tối ưu SEO..."           |
|                                          |
| [check] Bước 2: Core Content            |
|   Angle: [Storytelling]  Length: [Medium] |
|   [Link: Xem Core Content]              |
|                                          |
| [check] Bước 3: Vai trò chiến lược      |
|   [Sprout - Xây dựng lòng tin]           |
|                                          |
| [check] Bước 4: Đa kênh (3 kênh)        |
|   [FB] [IG] [TikTok]                    |
|   Preview thu gọn...                     |
+------------------------------------------+
| [Button: Mở & Chỉnh sửa]               |
+------------------------------------------+
```

Sử dụng Collapsible từ Radix UI để thu gọn preview kênh mặc định, người dùng có thể mở ra xem chi tiết từng kênh.
