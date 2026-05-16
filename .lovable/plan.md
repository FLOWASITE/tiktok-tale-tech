## Mục tiêu
- Đổi text "Directory" sang tiếng Việt
- Thu nhỏ thành icon button đặt cạnh tiêu đề "AI Content Agents", bỏ khỏi nhóm action button bên phải

## Thay đổi

### `src/pages/AgentDashboard.tsx`
- **Bỏ** button "Directory" khỏi header action bar (bên cạnh "Pause All" và "Campaign mới")
- **Thêm** icon button (`Radar` + tooltip "Danh sách Agent") ngay cạnh tiêu đề `<h1>AI Content Agents</h1>`
- Icon style: `ghost` hoặc viền nhẹ, size nhỏ (h-8 w-8), màu `text-muted-foreground` hover `text-foreground`
- Giữ nguyên logic mở Sheet `AgentDirectoryPage`

### `src/pages/AgentDirectoryPage.tsx`
- Đổi `<h1>Agent Directory</h1>` → `<h1>Danh sách Agent</h1>`

### `src/pages/AgentDashboard.tsx` (Sheet title)
- Đổi `SheetTitle` "Agent Directory" → "Danh sách Agent"

## Kết quả
- Header gọn hơn: chỉ còn 2 action button bên phải (Pause All + Campaign mới)
- Tiêu đề khu vực có icon info/directory nhỏ, dễ nhận diện nhưng không chiếm visual weight
- Toàn bộ text liên quan đã Việt hóa