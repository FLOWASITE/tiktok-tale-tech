

# Tự động gợi ý chủ đề bằng AI — Dùng Brand từ Header

## Thay đổi

Vì Brand luôn có sẵn ở header qua `useCurrentBrand()`, không cần thêm brand selector vào Step 1. AI sẽ dùng `currentBrand` trực tiếp.

### Sửa `GoalWizard.tsx` — Step 1

1. **Import `useCurrentBrand`** từ `@/contexts/BrandContext`
2. **Thêm nút "🤖 Gợi ý bằng AI"** cạnh label "Chủ đề nội dung"
   - Click → gọi `supabase.functions.invoke('topic-ai', { body: { action: 'suggest', brand_template_id: currentBrand.id, count: 8 } })`
   - Loading spinner khi đang gọi
3. **Hiển thị suggestion chips** bên dưới input
   - Mỗi chip là 1 topic gợi ý, click → thêm vào `topics[]`
   - Chip đã chọn → style checked (primary background)
   - Chip chưa chọn → style outline, clickable
4. **Vẫn giữ input nhập tay** — user có thể kết hợp AI suggest + nhập thêm
5. **Auto-fill `brandTemplateId`** từ `currentBrand.id` khi mở wizard (nếu chưa có giá trị), bỏ bước chọn brand thủ công ở Step 3 (chỉ hiển thị brand hiện tại dạng readonly)

### Step 3 (Thương hiệu) — Đơn giản hóa
- Hiển thị brand hiện tại từ header (readonly, không dropdown)
- Vẫn giữ Campaign selector

### Step 4 (Xác nhận)
- Brand hiển thị tên từ `currentBrand.brand_name`

## Files

| File | Loại |
|------|------|
| `src/components/agents/GoalWizard.tsx` | Sửa |

