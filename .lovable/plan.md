## Mục tiêu
Trên trang Brand Detail (`/brands/:id`), tab **Kết nối** hiện chỉ có icon + label. Bổ sung badge số lượng (giống tab **Personas** và **Sản phẩm**) để user thấy nhanh có bao nhiêu social connection đang active cho brand này.

## Thay đổi
**File:** `src/pages/BrandView.tsx`

1. Import `useSocialConnections` từ `@/hooks/useSocialConnections`.
2. Trong component `BrandView`, fetch connections theo `brandTemplateId`:
   ```tsx
   const { connections } = useSocialConnections({ brandTemplateId: id });
   const activeConnectionsCount = connections?.filter(c => c.is_active).length || 0;
   ```
3. Cập nhật `<TabsTrigger value="connections">` (dòng 233–236) để render badge khi count > 0, dùng đúng style hiện tại của Personas/Sản phẩm:
   ```tsx
   <TabsTrigger value="connections" ...>
     <Share2 className="w-3.5 h-3.5" />
     <span className="hidden sm:inline">Kết nối</span>
     {activeConnectionsCount > 0 && (
       <span className="text-[10px] bg-primary/10 text-primary px-1.5 rounded-full">
         {activeConnectionsCount}
       </span>
     )}
   </TabsTrigger>
   ```

## Ghi chú
- Dùng cùng filter `is_active` như `BrandViewHero` (dòng 79–80) để số trên tab khớp với badge "X Kết nối" trên hero card.
- Hook `useSocialConnections` đã có cache theo `['social-connections','brand',brandTemplateId]` nên không tạo thêm request thừa khi BrandViewConnectionsTab cũng dùng.
- Không thay đổi UI khác; không ảnh hưởng các tab còn lại.
