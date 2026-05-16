## Mục tiêu
Chuyển bước "AI hoạt động như thế nào" (autonomy) từ **mỗi campaign** sang **cài đặt chung của Workspace**, mặc định áp dụng cho mọi campaign mới. Người dùng vẫn có thể override khi cần.

## Thay đổi

### 1. Database
Thêm cột vào `organizations`:
- `default_autonomy_level` (text, default `'full_auto'`) — mức tự động mặc định cho workspace
- `default_approval_mode` (text, default `'full_auto'`) — map sang `approve_each | approve_plan | full_auto` để hiển thị

Migration additive, không phá data cũ. Goal hiện tại vẫn giữ `autonomy_level` riêng (override).

### 2. Trang Cài đặt Workspace (`src/pages/OrganizationSettings.tsx`)
Thêm section mới **"AI Agent — Mức tự động mặc định"**:
- 3 card chọn giống Step 3 của GoalWizard (Duyệt từng bài / Duyệt kế hoạch / Tự động hoàn toàn)
- Lưu vào `organizations.default_autonomy_level`
- Note: "Áp dụng cho mọi campaign mới. Bạn vẫn có thể đổi riêng cho từng campaign."

### 3. GoalWizard (`src/components/agents/GoalWizard.tsx`)
- **Bỏ Step 3 "Tự động"** khỏi flow mặc định → wizard còn 4 bước (Mục tiêu → Chiến lược → Kênh → Xác nhận)
- Khi tạo mới: auto-fill `autonomy_level` từ `organization.default_autonomy_level`
- Trong Step "Xác nhận": hiển thị badge "Mức tự động: Tự động hoàn toàn (theo cài đặt chung)" + link nhỏ **"Đổi riêng cho campaign này"** → mở dialog nhỏ chứa 3 lựa chọn (override-only, không thêm step)
- Stepper giảm còn 4 bước

### 4. Hook & types
- `useOrganization` / context: expose `defaultAutonomyLevel`
- `useAgentGoals.create`: nếu không truyền `autonomy_level` → dùng default từ org
- Update `src/types/organization.ts`

## Lý do
- Trải nghiệm hiện tại: user phải chọn lại autonomy mỗi lần tạo campaign → lặp lại không cần thiết
- 95% case user dùng 1 mức cố định cho cả workspace
- Vẫn giữ khả năng override per-campaign cho team cần kiểm soát chi tiết

## Technical
- Migration: `ALTER TABLE organizations ADD COLUMN default_autonomy_level text DEFAULT 'full_auto'` + CHECK constraint
- File chính sửa: `OrganizationSettings.tsx`, `GoalWizard.tsx` (xóa step 3, giảm stepper), `useAgentGoals.ts` (fallback default), `OrganizationContext.tsx` (expose field), `types/organization.ts`
- Không đụng `agent-pipeline` edge function (vẫn đọc `autonomy_level` từ goal như cũ)
