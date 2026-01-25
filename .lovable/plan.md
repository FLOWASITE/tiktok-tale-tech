

## Kế hoạch: Fix kiến trúc PersonaQuickAddDialog - Nhận createPersona từ props

### Thay đổi 1: Update PersonaQuickAddDialog props interface

**File:** `src/components/brand/PersonaQuickAddDialog.tsx`

1. Thêm 2 props mới vào interface:
```typescript
interface PersonaQuickAddDialogProps {
  brandTemplateId: string;
  organizationId?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  // THÊM 2 PROPS MỚI:
  createPersona: (persona: Omit<CustomerPersona, 'id' | 'created_at' | 'updated_at'>) => Promise<any>;
  existingPersonasCount: number;
}
```

2. Xóa dòng gọi hook riêng (dòng 56):
```typescript
// XÓA DÒNG NÀY:
const { createPersona, personas } = useCustomerPersonas({ brandTemplateId, enabled: true });
```

3. Cập nhật logic `isPrimary` (dòng 77):
```typescript
// TỪ:
const isPrimary = personas.length === 0 ? true : formData.is_primary;

// THÀNH:
const isPrimary = existingPersonasCount === 0 ? true : formData.is_primary;
```

4. Cập nhật điều kiện hiển thị "Set as Primary" button (dòng 358):
```typescript
// TỪ:
{personas.length > 0 && (

// THÀNH:
{existingPersonasCount > 0 && (
```

---

### Thay đổi 2: Update BrandViewPersonasTab để truyền props

**File:** `src/components/brand/BrandViewPersonasTab.tsx`

1. Destructure thêm `createPersona` từ hook (dòng 469):
```typescript
// TỪ:
const { personas, isLoading, refresh } = useCustomerPersonas({...});

// THÀNH:
const { personas, isLoading, refresh, createPersona } = useCustomerPersonas({...});
```

2. Cập nhật PersonaQuickAddDialog ở vị trí 1 (dòng 492-498):
```typescript
<PersonaQuickAddDialog
  brandTemplateId={template.id}
  organizationId={currentOrganization?.id}
  open={showAddDialog}
  onOpenChange={setShowAddDialog}
  onSuccess={() => refresh()}
  createPersona={createPersona}           // THÊM
  existingPersonasCount={personas.length} // THÊM
/>
```

3. Cập nhật PersonaQuickAddDialog ở vị trí 2 (dòng 548-554):
```typescript
<PersonaQuickAddDialog
  brandTemplateId={template.id}
  organizationId={currentOrganization?.id}
  open={showAddDialog}
  onOpenChange={setShowAddDialog}
  onSuccess={() => refresh()}
  createPersona={createPersona}           // THÊM
  existingPersonasCount={personas.length} // THÊM
/>
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
| Debug logs từ 2 contexts khác nhau | Debug logs từ 1 context thống nhất |

