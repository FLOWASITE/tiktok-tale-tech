## Mục tiêu
Di chuyển card "AI Agent — Mức tự động mặc định" từ trang **Tài khoản → Workspace** sang trang **AI Agent** (`/agents`), để cài đặt Agent nằm gọn trong khu vực Agent.

## Thay đổi

### 1. `src/pages/AgentDashboard.tsx`
- Thêm tab mới **"Cài đặt"** (value=`settings`) vào `TabsList` (sau tab `telegram`).
- Thêm `TabsContent value="settings"` render `<AgentAutonomyDefaultCard canEdit={canEditOrg} />`.
- Lấy `canEditOrg` từ `useOrganization()` (role `owner`/`admin`), tương tự logic ở `Account.tsx`.
- Import `AgentAutonomyDefaultCard` + icon `Settings` từ `lucide-react`.

### 2. `src/pages/Account.tsx`
- Xóa block render `<AgentAutonomyDefaultCard />` (dòng ~786) khỏi tab Workspace.
- Xóa import `AgentAutonomyDefaultCard` (dòng 44).

### 3. Không đổi
- `src/components/AgentAutonomyDefaultCard.tsx` giữ nguyên (chỉ đổi nơi gọi).
- Hook `useOrganizationSettings` giữ nguyên.
- Logic `GoalWizard` (đọc default autonomy) giữ nguyên.

## Ghi chú
- Nếu user không phải owner/admin, card vẫn render ở read-only (component đã handle `canEdit`).
- Tab "Cài đặt" sẽ là nơi mở rộng cho các cài đặt Agent khác trong tương lai (quota, model override, …).