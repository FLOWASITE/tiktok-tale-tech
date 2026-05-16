## Mục tiêu
Gộp tab **Telegram** vào tab **Cài đặt** trong AI Agent Dashboard để giảm số lượng tab và gom các cấu hình vào một chỗ.

## Thay đổi trong `src/pages/AgentDashboard.tsx`

1. **Xoá `TabsTrigger value="telegram"`** (dòng 255-257) khỏi `TabsList`.

2. **Xoá `TabsContent value="telegram"`** (dòng 439-441).

3. **Mở rộng `TabsContent value="settings"`** (dòng 443-445) thành 2 section:
   - **Section 1: "Mức tự động mặc định"** — giữ nguyên `<AgentAutonomyDefaultCard canEdit={canEditOrg} />`.
   - **Section 2: "Telegram Agent"** — render `<AgentTelegramPage />` bên dưới, có heading phân cách nhẹ (h2 hoặc divider) để rõ ranh giới giữa 2 nhóm cài đặt.

4. **Giữ nguyên** import `AgentTelegramPage` (vẫn dùng trong tab Settings).

## Kết quả
- Số tab giảm từ 7 → 6: Tổng quan / Pipeline / Duyệt / Campaigns / Team / **Cài đặt**.
- Trong tab Cài đặt, user thấy lần lượt: Mức tự động mặc định → Telegram Agent.
- Không thay đổi business logic, chỉ tái sắp xếp UI.
