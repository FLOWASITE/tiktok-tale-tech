

# Lọc số liệu hàng Workspace theo kỳ subscription hiện tại

## Vấn đề
Hiện tại `useAdminWorkspaces` fetch **tất cả** content/images (all-time), không lọc theo chu kỳ thanh toán. Cần thay đổi để các cột Nội dung, Ảnh, Tổng trong bảng chính hiển thị số liệu của **kỳ subscription hiện tại**.

## Thay đổi

### 1. `useAdminWorkspaces.ts` — Lọc theo subscription period

- Sau khi fetch subscriptions (`subsRes`), tính `current_period_start` và `current_period_end` cho mỗi org (fallback sang đầu-cuối tháng nếu hết hạn)
- Thay đổi query `multi_channel_contents` và `channel_image_history`: thêm select `created_at` (cho contents) để lọc client-side theo period của từng org
- Hoặc tốt hơn: fetch contents/images kèm `organization_id` và `created_at`, sau đó khi đếm chỉ count những record nằm trong period tương ứng của org đó

Cụ thể:
- Fetch contents: `supabase.from("multi_channel_contents").select("organization_id, created_at")`
- Fetch images: `supabase.from("channel_image_history").select("content_id, created_at, organization_id:multi_channel_contents(organization_id)")`  
- Build một `periodMap: Map<orgId, {start, end}>` từ subscriptions (với fallback current month)
- Khi count, chỉ tính records có `created_at` nằm trong period của org tương ứng

### 2. Không thay đổi UI (`AdminWorkspacesTab.tsx`)
UI giữ nguyên vì đã hiển thị `ws.content_count`, `ws.image_count` — chỉ cần data source trả về đúng số.

### File thay đổi

| File | Thay đổi |
|------|----------|
| `src/hooks/useAdminWorkspaces.ts` | Thêm logic lọc content/image theo subscription period của mỗi org |

