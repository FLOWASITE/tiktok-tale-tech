

## Thêm Headline và Sub-headline cho Brand Template

### Tổng quan
Thêm 2 trường mới **Headline** và **Sub-headline** vào form khai báo brand, giúp thương hiệu định nghĩa tiêu đề chính và phụ đề cho các nội dung marketing.

### Thay đổi

**1. Database Migration**
- Thêm 2 cột mới vào bảng `brand_templates`:
  - `headline TEXT DEFAULT NULL`
  - `sub_headline TEXT DEFAULT NULL`

**2. File: `src/components/BrandForm.tsx`**
- Thêm state: `headline`, `subHeadline`
- Load từ template khi edit: `template.headline`, `template.sub_headline`
- Gửi trong submit data: `headline`, `sub_headline`

**3. File: `src/components/BrandFormStepIdentity.tsx`**
- Thêm props: `headline`, `setHeadline`, `subHeadline`, `setSubHeadline`
- Thêm 2 input fields (Headline + Sub-headline) vào khu vực Chiến lược thương hiệu, cạnh Tagline/Slogan

**4. File: `src/hooks/useBrandTemplates.ts`**
- Thêm `headline` và `sub_headline` vào type `BrandTemplate`

**5. File: `src/components/brand/BrandViewOverviewTab.tsx`** (nếu có)
- Hiển thị Headline và Sub-headline trong trang xem chi tiết brand

**6. File: `src/utils/isBrandTemplateChanged.ts`**
- Thêm `headline` và `sub_headline` vào danh sách so sánh thay đổi

