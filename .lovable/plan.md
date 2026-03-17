

# Fix: HeaderBrandSwitcher không hiển thị brand cho member

## Nguyên nhân gốc

`BrandContext.fetchBrands()` chạy ngay khi `user` có giá trị, nhưng **không chờ OrganizationContext load xong**. Khi `currentOrganization` vẫn là `null` (đang loading), code rơi vào nhánh `else` → query `user_id = voduy's id`. Vì `voduy` không phải người tạo brand (brand do `duy@gmail.com` tạo), query trả về 0 → hiện "Tạo Brand".

Dù `fetchBrands` có dependency `currentOrganization?.id` và sẽ re-fetch khi org load xong, lần fetch đầu tiên với filter sai vẫn gây flash "Tạo Brand" hoặc trong một số trường hợp race condition không re-fetch đúng.

## Giải pháp

**File**: `src/contexts/BrandContext.tsx`

1. Import `loading` từ `useOrganizationContext()`
2. Trong `fetchBrands`, nếu OrganizationContext đang loading → return sớm (giữ `loading=true`, không fetch)
3. Điều này đảm bảo BrandContext chỉ query khi đã biết chắc user thuộc org nào

```typescript
const { currentOrganization, loading: orgLoading } = useOrganizationContext();

const fetchBrands = useCallback(async () => {
  if (!user) { /* ... clear state ... */ return; }
  if (orgLoading) return; // Chờ org load xong
  // ... rest of fetch logic
}, [user, currentOrganization?.id, storageKey, orgLoading]);
```

Chỉ sửa 1 file, ~3 dòng thay đổi.

