# Fix: Campaign Period & Hierarchy không hiển thị ở step nhập tên

## Nguyên nhân
`PeriodScopePicker` đang được render tại **Step 1 (Chiến lược)** — `GoalWizard.tsx` dòng 1767, bên trong block `step === 1`. User nhập tên ở **Step 0 (Mục tiêu)** nên không nhìn thấy picker tới khi bấm "Tiếp" qua bước Chiến lược.

Ngoài ra block "Thời lượng chiến dịch" (Duration grid + Start date + Posts target) cũng nằm chung Step 1 → toàn bộ logic khung thời gian bị giấu sau bước nhập tên.

## Sửa
Di chuyển 2 block về Step 0 (Mục tiêu) ngay dưới input "Tên chiến dịch" / mô tả:

1. `<PeriodScopePicker .../>` (dòng 1767–1781)
2. Block `{/* Duration & Posts Target */}` (dòng 1783–1830)

Vị trí mới: cuối Step 0, trước nút "Tiếp" → user thấy ngay sau khi gõ tên + mô tả.

Step 1 (Chiến lược) chỉ còn: Objectives + Auto-strategy switch + Budget/Pillar allocation. Hợp lý hơn vì khung thời gian thuộc về "Mục tiêu/Setup" chứ không phải "Chiến lược nội dung".

## Files chạm
- `src/components/agents/GoalWizard.tsx` — cut 2 block ra khỏi `step === 1`, paste vào cuối `step === 0`

## Không đổi
- Schema, hooks, PeriodScopePicker component
- Logic auto-fill startDate/duration
- Parent goal selection
- Backward compat (period_type='custom' mặc định)

## Validate sau khi sửa
- Step 0 hiển thị: Tên + Mô tả + **PeriodScopePicker** + Duration grid + Start date
- Bấm "Tháng này" → start date + duration tự fill, input bị disable
- Sang Step 1 không còn block khung thời gian
