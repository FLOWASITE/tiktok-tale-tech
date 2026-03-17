

# Đưa Brand Selector lên Header gắn với Workspace

## Ý tưởng

Hiện tại Brand được chọn riêng lẻ trong từng trang (MultiChannelCreate, CarouselForm, ScriptForm, Topics...). Mỗi trang tự quản lý `selectedBrandId` riêng → không nhất quán, phải chọn lại mỗi khi chuyển trang.

Giải pháp: Tạo **BrandContext** cấp global, hiển thị Brand Selector trên Header (cạnh OrganizationSwitcher), brand được chọn sẽ tự động áp dụng cho tất cả các trang.

## Kiến trúc

```text
AppLayout Header:
┌─[Sidebar]─[OrgSwitcher]─[BrandSwitcher]───────[Search][Help][Notif][Theme][Avatar]─┐
```

### 1. Tạo `BrandContext` (Context mới)
**File**: `src/contexts/BrandContext.tsx`

- State: `currentBrand`, `brands[]`, `loading`
- Tự động fetch brands theo `currentOrganization.id` (dùng logic từ `useBrandTemplates`)
- Lưu `selectedBrandId` vào `localStorage` (key: `flowa_current_brand_${orgId}`)
- Khi switch organization → tự động reset/load brand phù hợp
- Export hook `useCurrentBrand()` để các trang dùng

### 2. Tạo `HeaderBrandSwitcher` component
**File**: `src/components/HeaderBrandSwitcher.tsx`

- Dropdown nhỏ gọn trên header (tương tự OrganizationSwitcher nhưng compact hơn)
- Hiển thị: logo brand + tên brand + primary_color indicator
- Dropdown list các brand trong org hiện tại
- Link nhanh đến trang Quản lý Brand (`/brands`)

### 3. Cập nhật `AppLayout.tsx`
- Thêm `HeaderBrandSwitcher` vào header, sau `OrganizationSwitcher`
- Wrap children trong `BrandProvider`

### 4. Cập nhật các trang sử dụng brand
Các trang sau sẽ đọc `currentBrand` từ context thay vì tự quản lý:
- `MultiChannelCreate.tsx` — bỏ state `selectedBrandId` local, dùng context
- `CarouselForm.tsx` — tương tự
- `ScriptFormStepper.tsx` — tương tự
- `Topics.tsx` — tương tự

Mỗi trang vẫn cho phép **override** brand nếu cần (ví dụ user muốn chọn brand khác cho 1 bài cụ thể), nhưng mặc định lấy từ context.

## Scope

| Thay đổi | File |
|---|---|
| Context mới | `src/contexts/BrandContext.tsx` |
| Component mới | `src/components/HeaderBrandSwitcher.tsx` |
| Sửa layout | `src/components/AppLayout.tsx` |
| Sửa 4 trang | `MultiChannelCreate`, `CarouselForm`, `ScriptFormStepper`, `Topics` |

Không cần migration database — chỉ thay đổi frontend.

