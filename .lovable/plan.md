

## Kế hoạch: Fix kiến trúc PersonaQuickAddDialog - Nhận createPersona từ props

### Vấn đề hiện tại

Trong `PersonaQuickAddDialog.tsx` (dòng 56):
```typescript
const { createPersona, personas } = useCustomerPersonas({ brandTemplateId, enabled: true });
```

Dialog gọi **instance riêng biệt** của `useCustomerPersonas` hook, trong khi `BrandViewPersonasTab` cũng gọi hook riêng của nó. Điều này gây ra:
- 2 instances riêng biệt với state riêng
- Khi dialog tạo persona, nó gọi `createPersona` từ instance 1, nhưng refresh gọi từ instance 2
- Potential mismatch về `currentOrganization` giữa các contexts

### Giải pháp

Refactor `PersonaQuickAddDialog` để **nhận callbacks qua props** thay vì gọi hook riêng.

---

### Thay đổi 1: Update PersonaQuickAddDialog props

**File:** `src/components/brand/PersonaQuickAddDialog.tsx`

```typescript
interface PersonaQuickAddDialogProps {
  brandTemplateId: string;
  organizationId?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  // Thêm props mới
  createPersona: (persona: Omit<CustomerPersona, 'id' | 'created_at' | 'updated_at'>) => Promise<any>;
  existingPersonasCount: number; // Để xác định is_primary
}
```

---

### Thay đổi 2: Remove hook call từ PersonaQuickAddDialog

**File:** `src/components/brand/PersonaQuickAddDialog.tsx`

Xóa dòng:
```typescript
// XÓA DÒNG NÀY:
const { createPersona, personas } = useCustomerPersonas({ brandTemplateId, enabled: true });
```

Thay thế bằng:
```typescript
// Sử dụng props trực tiếp
const { createPersona, existingPersonasCount } = props;
```

Cập nhật logic `isPrimary`:
```typescript
// Thay đổi từ:
const isPrimary = personas.length === 0 ? true : formData.is_primary;

// Thành:
const isPrimary = existingPersonasCount === 0 ? true : formData.is_primary;
```

Cập nhật điều kiện hiển thị "Set as Primary" button:
```typescript
// Thay đổi từ:
{personas.length > 0 && (

// Thành:
{existingPersonasCount > 0 && (
```

---

### Thay đổi 3: Update BrandViewPersonasTab để truyền props

**File:** `src/components/brand/BrandViewPersonasTab.tsx`

Ở 2 vị trí sử dụng `PersonaQuickAddDialog` (dòng ~492-498 và ~537-543):

```typescript
<PersonaQuickAddDialog
  brandTemplateId={template.id}
  organizationId={currentOrganization?.id}
  open={showAddDialog}
  onOpenChange={setShowAddDialog}
  onSuccess={() => refresh()}
  // THÊM 2 PROPS MỚI:
  createPersona={createPersona}
  existingPersonasCount={personas.length}
/>
```

Cần cập nhật destructure từ hook:
```typescript
// Thay đổi từ:
const { personas, isLoading, refresh } = useCustomerPersonas({...});

// Thành:
const { personas, isLoading, refresh, createPersona } = useCustomerPersonas({...});
```

---

### Files cần sửa

| File | Thay đổi |
|------|----------|
| `src/components/brand/PersonaQuickAddDialog.tsx` | Nhận `createPersona` và `existingPersonasCount` qua props, xóa hook call |
| `src/components/brand/BrandViewPersonasTab.tsx` | Truyền `createPersona` và `personas.length` vào dialog |

---

### Kết quả mong đợi

| Trước | Sau |
|-------|-----|
| Dialog gọi hook riêng, có thể mismatch organization | Dialog sử dụng cùng instance với parent |
| 2 fetch requests cho personas | 1 fetch request duy nhất |
| Potential race condition khi refresh | Đồng bộ hoàn toàn giữa parent và dialog |

---

### Lưu ý

Sau khi implement, các debug logs đã thêm sẽ giúp xác nhận:
1. `[BrandViewPersonasTab]` logs hiển thị `template.id` và `currentOrganization`
2. `[PersonaQuickAddDialog]` logs hiển thị dữ liệu được truyền đúng
3. `[useCustomerPersonas]` logs hiển thị INSERT request thực sự được gọi

