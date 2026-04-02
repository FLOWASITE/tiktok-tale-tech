

# Đưa Agent Directory vào AI Agent Dashboard

## Hiện trạng
- Agent Directory hiện là một trang riêng tại `/agents/directory` và có mục riêng trên sidebar.
- AI Agent Dashboard (`/agents`) đã có các tab: Tổng quan, Pipeline, Duyệt, Campaigns, Kế hoạch, Team.

## Kế hoạch

### 1. Thêm nút "Agent Directory" vào header của AgentDashboard
- Đặt một **Button** (icon `Radar` + text "Directory") cạnh nút "Pause All" trong phần header.
- Khi click, mở một **Sheet** (slide-in panel từ bên phải) hiển thị nội dung `AgentDirectoryPage`.
- Dùng Sheet thay vì tab để tránh làm quá tải thanh tab hiện tại, đồng thời giữ tính chất "tra cứu / tham khảo" của Directory.

### 2. Xoá mục sidebar "Agent Directory"
- Loại bỏ item `Agent Directory` khỏi `agentItems` trong `AppSidebar.tsx`.
- Xoá route `/agents/directory` khỏi `routes.tsx`.

### 3. File cần sửa
- **`src/pages/AgentDashboard.tsx`**: Import `Sheet`, `AgentDirectoryPage`, icon `Radar`. Thêm state `directoryOpen` và nút + Sheet component.
- **`src/components/AppSidebar.tsx`**: Xoá item Agent Directory khỏi `agentItems`.
- **`src/app/routes.tsx`**: Xoá route `/agents/directory`.

