

# Nguyên nhân: duy@gmail.com thấy bài viết của flowasite@gmail.com

## Phân tích

Cả hai tài khoản đều thuộc cùng tổ chức **"Công ty CP Công nghệ Flowa"** (`bccfec38-...`):
- `flowasite@gmail.com` — role: **owner**
- `duy@gmail.com` — role: **member**

RLS policy `Users can view org multi_channel_contents` cho phép **mọi member trong org** xem tất cả content của org đó. Đây là **đúng thiết kế** cho teamwork.

**Tuy nhiên**, query trong `useMultiChannelContents.ts` (dòng 87-90) **không filter theo organization_id**:
```typescript
const { data, error } = await supabase
  .from('multi_channel_contents')
  .select('*')
  .order('created_at', { ascending: false });
// ← Không có .eq('organization_id', ...)
```

Kết quả: Khi duy@ đang ở org riêng ("Thùy Nguyễn's Workspace"), vẫn thấy content từ org chung "Công ty CP Công nghệ Flowa" — vì RLS cho phép và query không lọc.

## Giải pháp

**Filter theo `currentOrganization.id`** trong query fetch, giống cách các hook khác đã làm (ví dụ `ContentCalendar.tsx` dòng 334).

### Sửa `src/hooks/useMultiChannelContents.ts`

Thêm filter `organization_id` dựa trên org đang chọn:

```typescript
// Thêm import useOrganizationContext
// Trong fetchContents:
const { data, error } = await supabase
  .from('multi_channel_contents')
  .select('*')
  .eq('organization_id', currentOrganization.id)  // ← Thêm filter
  .order('created_at', { ascending: false });
```

Cần thêm `currentOrganization` vào dependency của `useEffect` để refetch khi user switch org.

### Scope thay đổi
- **1 file**: `src/hooks/useMultiChannelContents.ts`
- Thêm `useOrganizationContext()` hook
- Filter query theo `currentOrganization.id`
- Refetch khi org thay đổi

