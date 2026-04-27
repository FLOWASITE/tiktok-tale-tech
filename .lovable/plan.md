## 🎯 Vấn đề
Mockup **Google Maps** đang hardcode thông tin:
- Địa chỉ: `123 Nguyễn Huệ, Quận 1, TP.HCM`
- SĐT: `028 1234 5678`
- Website: `www.{brandname}.com`
- Rating: `4.6 / 328 đánh giá`
- Mô tả: `Dịch vụ Marketing`

→ Không phản ánh đúng brand. Ví dụ Flowa thực tế đã có trong DB:
- `address`: `304/15 Tân Kỳ Tân Quý, phường Tân Sơn Nhì, Tp. Hồ Chí Minh`
- `phone`: `0838 226 363`
- `website`: `https://flowa.one/`
- `company_name`: `Công ty CP Công nghệ Flowa`

Dữ liệu này **đã sẵn có** trong `brand_templates.footer_info` (jsonb) — cùng cấu trúc với `BrandFooterInfo` (`company_name`, `phone`, `email`, `website`, `address`).

## 🔧 Thay đổi

### 1. `src/components/preview/GoogleMapsMockup.tsx`
Thêm prop `footerInfo?: BrandFooterInfo` và `industry?: string` (lấy ngành từ brand thay cho "Dịch vụ Marketing"):

```tsx
interface GoogleMapsMockupProps {
  content: string;
  brandName: string;
  logoUrl?: string;
  isGenerating?: boolean;
  channelImage?: string;
  footerInfo?: BrandFooterInfo | null;   // ✨ NEW
  industryLabel?: string;                // ✨ NEW (fallback "Doanh nghiệp")
}
```

Logic render:
- **Address**: `footerInfo?.address` → nếu rỗng, ẩn dòng địa chỉ (không hiển thị placeholder giả).
- **Phone**: `footerInfo?.phone` → nếu rỗng, ẩn dòng SĐT.
- **Website**: ưu tiên `footerInfo?.website` (strip `https?://` và trailing `/` để hiển thị sạch như Maps thật `flowa.one`); fallback về `displayUrl` cũ chỉ khi không có data.
- **Subtitle dưới brand name**: dùng `industryLabel` (vd: "Phần mềm Marketing") thay cho hardcode "Dịch vụ Marketing"; fallback "Doanh nghiệp".
- **Rating + reviewCount**: giữ tạm `4.6 / 328` nhưng đánh dấu rõ là **demo data** (Maps mockup chỉ là preview, rating thật cần tích hợp GBP API). Có thể hash từ `brandName` để mỗi brand có con số khác nhau (vd: 4.5–4.9, 80–500 reviews) — tránh cảm giác "y hệt nhau".

### 2. `src/components/viewer/ContentMockupToggle.tsx`
- Thêm prop `footerInfo?: BrandFooterInfo | null` và `industryLabel?: string`.
- Truyền xuống `GoogleMapsMockup`.

### 3. `src/components/MultiChannelViewer.tsx`
- Mở rộng query `brand-template-viewer` để select thêm `footer_info, industry`:
  ```ts
  .select('logo_url, channel_overrides, footer_info, industry')
  ```
- Truyền vào `<ContentMockupToggle ... footerInfo={brandTemplateData?.footer_info} industryLabel={brandTemplateData?.industry?.[0]} />` (industry là array; lấy phần tử đầu).

### 4. (Tùy chọn) `BrandSampleContentViewer` 
Nếu mockup Google Maps cũng hiển thị ở tab "Xem mẫu" của Brand, truyền tương tự — tôi sẽ kiểm tra và bổ sung trong lúc implement.

## ✅ Kết quả mong đợi
Khi mở mockup Google Maps cho brand **Flowa**:
- Địa chỉ: `304/15 Tân Kỳ Tân Quý, phường Tân Sơn Nhì, Tp. Hồ Chí Minh`
- SĐT: `0838 226 363`
- Website: `flowa.one`
- Subtitle: industry thật của brand (vd: `Phần mềm`)
- Brand nào chưa nhập `footer_info` → các dòng tương ứng được ẩn gọn gàng, không hiển thị data giả.

## 📁 Files sẽ sửa
- `src/components/preview/GoogleMapsMockup.tsx`
- `src/components/viewer/ContentMockupToggle.tsx`
- `src/components/MultiChannelViewer.tsx`
- (có thể) `src/components/BrandSampleContentViewer.tsx`