## Mục tiêu

Trang Kết nối hiện đổ một list dài 16 platform vào 1 Card duy nhất → khó scan, không phân biệt được "đăng social ngắn" vs "đăng blog dài" vs "local business". Nâng cấp bằng cách **phân loại theo nhóm chức năng** + cải thiện hierarchy thị giác.

## Phân loại 3 nhóm (đồng bộ với Multichannel reclassification)

```text
┌─ 1. Mạng xã hội (Social) ──────────────────────────────┐
│  Facebook · Instagram · TikTok · Threads · X (Twitter) │
│  LinkedIn · Pinterest · Bluesky · YouTube              │
└────────────────────────────────────────────────────────┘

┌─ 2. Website & Long-form (Blog/CMS) ────────────────────┐
│  WordPress · WordPress.com · Blogger                   │
│  Shopify · Wix · Website (custom API/Webhook)          │
└────────────────────────────────────────────────────────┘

┌─ 3. Local & Messaging ─────────────────────────────────┐
│  Google Business · Zalo OA                             │
└────────────────────────────────────────────────────────┘
```

## Thay đổi UI

**File:** `src/components/brand/BrandViewConnectionsTab.tsx`

1. Thêm hằng số `PLATFORM_GROUPS` map mỗi `SocialPlatform` → `'social' | 'longform' | 'local'` + label/description nhóm + icon nhóm (Share2 / Globe / MapPin).
2. Thay 1 Card duy nhất bằng **3 Card riêng** theo nhóm:
   - Mỗi Card có header: icon nhóm + tên nhóm + badge "X/Y đã kết nối".
   - Body render đúng các platform thuộc nhóm bằng chính `renderConnection()` / `renderFacebookPlatform()` / `renderWebsitePlatform()` đã có.
3. Sắp xếp thứ tự trong từng nhóm: ưu tiên platform `available: true` và đã có connection lên trên.
4. Giữ nguyên dialog/handler hiện tại — chỉ tổ chức lại layout, không động code OAuth.

## Polish nhỏ

- Sửa `Twitter` icon trong dialog Twitter setup (hiện dùng Lucide `Twitter` cũ) → `<ChannelIcon channel="twitter" />` cho đồng bộ Soft Luxury.
- Bỏ entry trùng `Website` khỏi nhóm Long-form nếu đã có `WordPress` + `Shopify` + `Wix` + `Blogger` (Website hiện là fallback cho custom API/Webhook → giữ riêng cuối nhóm).
- Thêm divider nhỏ (border-t neutral) giữa các Card để không gian thở "Soft Luxury".

## Không thay đổi

- Logic kết nối, OAuth flow, dialog setup.
- File `ChannelIcon` (đã sửa Shopify/Wix ở turn trước).
- Trang `Connections.tsx` (chỉ redirect → `/brands/:id?tab=connections`).
