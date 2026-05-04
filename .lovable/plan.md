## Mục tiêu
Bổ sung phần **Hướng dẫn từng bước** vào dialog "Kết nối Shopify" trong `BrandViewConnectionsTab.tsx` (lines 1639-1677) để user tránh lỗi `ERR_BLOCKED_BY_RESPONSE` khi store bị Shopify chặn (do password protection / app chưa cài).

## File chỉnh sửa
`src/components/brand/BrandViewConnectionsTab.tsx` — chỉ sửa block Dialog Shopify (lines 1639-1677), không động phần khác.

## Nội dung bổ sung trong Dialog

### 1. Thêm Alert hướng dẫn 3 bước (trước Input)
Block màu amber, icon `Info`, gồm 3 checklist:

1. **Tắt Password Protection** (cho Development Store)
   `Online Store → Preferences → bỏ chọn "Restrict access with password"`

2. **Cài Flowa App vào store**
   Nếu chưa cài → mở `partners.shopify.com → Apps → Flowa → Test → Select store → Install`

3. **Đảm bảo shop domain đúng**
   Định dạng `your-store.myshopify.com` (chỉ chữ thường, số, dấu gạch)

### 2. Thêm Collapsible "Gặp lỗi không kết nối được?" (sau Input)
Liệt kê 3 nguyên nhân + cách khắc phục lỗi `ERR_BLOCKED_BY_RESPONSE`:
- Store bật Password Protection → tắt theo bước 1
- Shopify App chưa được cài → cài theo bước 2
- Shop domain không tồn tại → kiểm tra trong Shopify Admin

### 3. Thêm link tài liệu Shopify (footer dialog)
Link nhỏ: "Xem hướng dẫn chi tiết" → mở `help.shopify.com/en/manual/online-store/themes/password-page` ở tab mới.

### 4. Tăng max-width dialog
`max-w-md` → `max-w-lg` để hướng dẫn không bị chật.

## Components dùng
- `Alert`, `AlertDescription` từ `@/components/ui/alert` (đã có)
- `Collapsible`, `CollapsibleTrigger`, `CollapsibleContent` từ `@/components/ui/collapsible` (đã có)
- Icon `Info`, `ChevronDown`, `ExternalLink` từ `lucide-react`
- Giữ nguyên logic `handleShopifySubmit` và state hiện tại — không thay đổi backend/edge function.

## Không thay đổi
- Edge function `shopify-oauth-start` (đã đúng)
- State management và validation regex
- Layout các dialog khác trong file