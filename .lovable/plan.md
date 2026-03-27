

# Hoàn thiện flow tạo AI Campaign — hiển thị tiến trình thay vì đóng dialog

## Vấn đề hiện tại

Khi user nhấn "Khởi chạy Campaign" ở bước cuối:
1. AI clarification chạy → hiển thị "understanding" 1.5 giây
2. `finalSubmit` gọi `onSubmit` → `handleCreateGoal` **đóng dialog ngay** (`setWizardOpen(false)`)
3. Gọi `generate-campaign-strategy` trong background — user chỉ thấy toast nhỏ, không biết đang xử lý gì
4. Khi xong → toast thông báo kết quả, chuyển tab

User muốn: sau khi xác nhận, dialog **không đóng** mà tiếp tục hiển thị tiến trình AI đang tạo kế hoạch, rồi mới kết thúc.

## Giải pháp

Chuyển logic gọi `generate-campaign-strategy` **vào trong GoalWizard**, thêm 1 bước "Generating" hiển thị trong dialog thay vì đóng và chạy background.

### Flow mới

```text
Step 4 (Xác nhận) → Nhấn "Khởi chạy"
  → AI Clarification (giữ nguyên)
  → finalSubmit gọi onSubmit (tạo goal trong DB)
  → Dialog KHÔNG đóng → chuyển sang trạng thái "generating"
  → Hiển thị animation + progress steps trong dialog:
     ✓ Đã tạo campaign goal
     ⟳ Đang lên kế hoạch nội dung...
     ○ Hoàn tất
  → Khi strategy xong → hiển thị kết quả (số bài, số pipeline)
  → Nút "Xem kế hoạch" đóng dialog + chuyển tab
```

### Thay đổi cụ thể

#### 1. Sửa `GoalWizard.tsx`
- Thêm state: `generatingStatus: 'idle' | 'saving' | 'generating' | 'done' | 'error'` và `generationResult`
- Thêm prop `onGenerateStrategy` (callback trả về Promise với kết quả)
- Sau `finalSubmit` → không gọi `onSubmit` đơn giản, mà:
  1. Set status = `'saving'`, gọi `onSubmit` (tạo goal)
  2. Set status = `'generating'`, gọi `onGenerateStrategy` (tạo kế hoạch)
  3. Set status = `'done'`, hiển thị kết quả
- Render trạng thái generating trong dialog body (thay vì step 4 content):
  - Progress steps với checkmarks animated
  - Kết quả cuối cùng: số bài viết, kênh, nút "Xem kế hoạch"

#### 2. Sửa `AgentDashboard.tsx`
- Tách logic `handleCreateGoal` thành 2 phần:
  - `handleSaveGoal`: chỉ tạo goal trong DB, trả về `goalId`
  - `handleGenerateStrategy`: nhận goalId + data, gọi edge function, trả về result
- Truyền cả 2 callback vào GoalWizard
- Không `setWizardOpen(false)` ngay — GoalWizard tự đóng khi user nhấn "Xem kế hoạch"

### File thay đổi
- **Sửa**: `src/components/agents/GoalWizard.tsx` — thêm generating state + UI progress steps
- **Sửa**: `src/pages/AgentDashboard.tsx` — tách logic, truyền callbacks mới

