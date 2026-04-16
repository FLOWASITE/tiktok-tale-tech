

## Fix: Sản phẩm không hiển thị khi chỉnh sửa Brand

### Nguyên nhân

Khi mở form "Chỉnh sửa Brand Template", danh sách personas được đồng bộ từ database vào state local (dòng 121-125 trong `BrandForm.tsx`), nhưng **sản phẩm thì không**. `localProducts` luôn bắt đầu là mảng rỗng `[]`, nên dù đã tạo sản phẩm trong DB, form không hiển thị chúng.

### Giải pháp

Thêm logic tương tự personas: dùng `useProductCatalog` để fetch sản phẩm từ DB, rồi sync vào `localProducts` khi đang edit template có sẵn.

### Thay đổi

**File: `src/components/BrandForm.tsx`**

1. Import `useProductCatalog` hook
2. Gọi `useProductCatalog(template?.id)` để fetch sản phẩm từ DB
3. Thêm `useEffect` sync DB products → `localProducts` (tương tự pattern personas ở dòng 121-125):
```tsx
const { products: dbProducts } = useProductCatalog(template?.id);

useEffect(() => {
  if (template?.id && dbProducts.length > 0) {
    setLocalProducts(dbProducts.map(p => ({
      id: p.id,
      name: p.name,
      sku: p.sku || '',
      category: p.category || '',
      description: p.description || '',
      price_display: p.price_display || '',
      image_url: p.image_url || '',
      unique_selling_points: p.unique_selling_points || [],
      target_audience: p.target_audience || '',
      pain_points_solved: p.pain_points_solved || [],
      benefits: p.benefits || [],
      keywords: p.keywords || [],
      suggested_content_angles: p.suggested_content_angles || [],
      best_channels: p.best_channels || [],
      is_featured: p.is_featured || false,
      is_active: p.is_active !== false,
    })));
  }
}, [template?.id, dbProducts]);
```

Chỉ thay đổi 1 file, thêm ~20 dòng code.

