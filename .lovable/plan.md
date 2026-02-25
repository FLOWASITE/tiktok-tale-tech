
# Kết nối Chatbot với Quy trình Tạo Nội dung Đa kênh

## Vấn đề hiện tại

Khi bạn nhắn "tạo nội dung cho hôm nay" trong chatbot, hệ thống gọi tool `generate_multichannel` nhưng chỉ gửi **3 tham số cơ bản** (topic, channels, content_goal) đến backend. Trong khi đó, form tạo nội dung đầy đủ ở `/multichannel/new` gửi **hơn 15 tham số** bao gồm:

- user_id, organization_id
- brandVoiceVariantId
- journeyStage (Seed/Sprout/Harvest)
- contentAngle, personaId, productId
- selected_hooks, auto_research
- v.v.

Kết quả là nội dung tạo từ chatbot:
1. **Thiếu chiến lược** (không có journey stage, content angle, hooks)
2. **Không lưu vào danh sách** nội dung đa kênh (thiếu user_id, org_id)
3. **Không xuất hiện** trong trang `/multichannel`

## Giải pháp

Nâng cấp tool `generate_multichannel` trong hệ thống agent để gửi đầy đủ tham số như form wizard, đảm bảo nội dung được lưu đúng cách.

### Thay đổi 1: Mở rộng Tool Definition (`tool-definitions.ts`)

Thêm các tham số chiến lược vào schema của tool `generate_multichannel`:
- `content_angle` (educational, storytelling, promotional, v.v.)
- `journey_stage` (seed, sprout, harvest)
- `auto_research` (boolean)

### Thay đổi 2: Nâng cấp Tool Executor (`tool-executor.ts`)

Cập nhật hàm `executeGenerateMultichannel` để:
- Truyền `user_id` và `organization_id` từ execution context
- Truyền thêm `contentAngle`, `targetJourneyStage`, `autoResearch`
- Đảm bảo nội dung được lưu vào database giống như khi tạo từ form

### Thay đổi 3: Cập nhật Content Agent Prompt (`content-agent.ts`)

Hướng dẫn agent:
- Tự chọn `journey_stage` phù hợp (mặc định "seed" cho nội dung mới)
- Tự chọn `content_angle` dựa trên ngữ cảnh
- Luôn truyền đầy đủ channels (ít nhất facebook + instagram)

### Thay đổi 4: Truyền userId/orgId vào Agent Context

Đảm bảo `executeAgent` truyền `userId` và `organizationId` xuống tool executor để nội dung được gắn đúng user.

---

## Kết quả sau khi sửa

- Nhắn "tạo nội dung cho hôm nay" trong chatbot sẽ tạo nội dung **đầy đủ chiến lược**
- Nội dung sẽ **xuất hiện trong danh sách** tại `/multichannel`
- Trải nghiệm tương đương với việc dùng form wizard

## Chi tiết kỹ thuật

```text
Trước:
  Chatbot -> generate_multichannel(topic, channels, content_goal)
  -> Thiếu user_id, org_id -> Không lưu vào DB đúng cách

Sau:
  Chatbot -> generate_multichannel(topic, channels, content_goal, 
             journey_stage, content_angle, auto_research)
  + Tự động inject user_id, organization_id từ context
  -> Lưu đầy đủ vào DB -> Hiển thị trong /multichannel
```

**Files cần sửa:**
1. `supabase/functions/_shared/tool-definitions.ts` - Thêm params
2. `supabase/functions/_shared/tool-executor.ts` - Truyền đầy đủ data
3. `supabase/functions/_shared/agents/content-agent.ts` - Cập nhật prompt
