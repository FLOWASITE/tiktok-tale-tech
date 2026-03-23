

# Trang Agent Directory — Mô tả công việc chi tiết từng Agent

## Mục tiêu
Tạo trang `/agents/directory` hiển thị danh sách 7 agents + Orchestrator, mỗi agent có mô tả chi tiết: vai trò, input/output, tools sử dụng, vị trí trong pipeline, và trạng thái hoạt động hiện tại.

## Thiết kế UI

Trang dạng **card grid** — mỗi agent 1 card lớn chứa:

- **Icon + Tên + Badge trạng thái** (active/idle/flagged — lấy từ pipelines realtime)
- **Vai trò**: Mô tả 1-2 câu
- **Công việc cụ thể**: Danh sách bullet points
- **Input**: Nhận gì từ agent trước
- **Output**: Trả ra gì cho agent sau
- **Tools**: Các tool agent sử dụng (web_search, brand_voice_check, etc.)
- **Model & Chi phí**: Model AI sử dụng + estimated cost/call
- **Vị trí pipeline**: Visual indicator stage nào trong pipeline

8 agents:
1. **Orchestrator** — Điều phối toàn bộ pipeline, phân công tasks
2. **Research** — Nghiên cứu xu hướng, chọn topic tốt nhất
3. **Strategy** — Lập kế hoạch content, calendar, gap analysis
4. **Creator** — Viết content hoàn chỉnh từ brief
5. **Optimizer** — Tối ưu SEO + GEO scores
6. **Expander** — Mở rộng ra multi-channel versions
7. **Compliance** — Kiểm tra tuân thủ, brand consistency
8. **Analyst** — Theo dõi performance, feedback loop

## Thay đổi kỹ thuật

### 1. Tạo `src/pages/AgentDirectoryPage.tsx`
- Dữ liệu agent descriptions là static (hardcoded array)
- Trạng thái realtime: dùng `useAgentPipelines()` để đếm active pipelines per agent
- Layout: responsive grid 1-2-3 columns
- Mỗi card expandable (click để xem chi tiết tools/IO)

### 2. Tạo `src/components/agents/AgentDetailCard.tsx`
- Component card cho từng agent
- Collapsible sections: mặc định show vai trò + công việc, expand để xem tools/IO/cost
- Badge trạng thái kết nối realtime pipeline data

### 3. Sửa routing + sidebar
- Thêm route `/agents/directory` trong `routes.tsx`
- Thêm sub-item "Agents" dưới "AI Agents" trong AppSidebar (icon: Bot)

## Files

| File | Loại |
|------|------|
| `src/pages/AgentDirectoryPage.tsx` | Tạo |
| `src/components/agents/AgentDetailCard.tsx` | Tạo |
| `src/app/routes.tsx` | Sửa — thêm route |
| `src/components/AppSidebar.tsx` | Sửa — thêm menu item |

