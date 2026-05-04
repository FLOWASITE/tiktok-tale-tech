## Vấn đề

Trong picker "Kênh xuất bản" của Multichannel, **Shopify Blog** và **Wix Blog** đang dùng nhầm icon `WordPressIcon` (chữ "W" trong vòng tròn) thay vì icon thật của Shopify (túi mua sắm xanh) và Wix (chữ "WiX" đen).

Lý do: nhiều file picker được clone trước khi `ShopifyIcon` / `WixIcon` được thêm vào `SocialIcons.tsx`, nên vẫn hardcode `WordPressIcon` cho cả 3 kênh.

## Files cần sửa

Map `shopify` → `ShopifyIcon`, `wix` → `WixIcon`:

1. **`src/components/multichannel/MultiChannelFormStepper.tsx`** (line 60, 174-175) — thêm import `ShopifyIcon, WixIcon`, đổi icon map.
2. **`src/components/multichannel/MultiChannelFormWizard.tsx`** (line 86, 211-212) — tương tự.
3. **`src/components/multichannel/ImageChannelPicker.tsx`** (line 8, 26-27) — thêm import + đổi icon + đổi label `'WP'` → `'Shop'` / `'Wix'`.
4. **`src/components/multichannel/MultiChannelHookGenerator.tsx`** (line 61, 114-115) — thêm import + đổi icon map.
5. **`src/components/multichannel/UnifiedImageGenerator.tsx`** (line 101-102) — đổi `<ChannelIcon channel="wordpress" />` → `channel="shopify"` / `channel="wix"`, sửa color tokens (#96BF48 cho Shopify, neutral cho Wix).
6. **`src/components/multichannel/ExpandChannelsDialog.tsx`** (line 35-36) — đổi `channel="wordpress"` → `"shopify"` / `"wix"`.
7. **`src/components/multichannel/ExpandChannelsStreamingDialog.tsx`** (line 39-40) — tương tự.

## Không thay đổi

- `ChannelIcon.tsx` (streaming) đã đúng từ turn trước.
- Logic generate / publish / DB column mapping (`shopify_content`, `wix_content`) giữ nguyên.
- `UnconnectedChannelsBanner` map `shopify→blogger` / `wix→blogger` là logic fallback connection, không phải icon hiển thị → giữ nguyên.