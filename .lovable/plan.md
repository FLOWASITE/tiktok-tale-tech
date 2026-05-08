## Mục tiêu
Refactor `GoogleAuthSignInCard.tsx` để **đồng nhất visual** với các platform card khác trong `AdminSocialSettings` (Facebook, Bluesky, Shopify…), thay vì dùng layout amber-alert riêng biệt như hiện tại.

## Pattern các card khác đang dùng (renderPlatformCard)
```text
┌──────────────────────────────────────────────┐
│ [icon] Tên platform           [Badge ✓/OAuth]│
│        platform_code                         │
├──────────────────────────────────────────────┤
│ ┌────── info box muted ──────┐               │
│ │ App        Flowa Web Client│               │
│ │ Key        ••••            │               │
│ │ Trạng thái Đang hoạt động  │               │
│ └────────────────────────────┘               │
│ [Cấu hình]  [⚡Test]  [🗑]                    │
└──────────────────────────────────────────────┘
```

Đặc điểm: padding `pb-3`, icon trong `p-2.5 rounded-lg bg-muted/60`, title `text-sm font-semibold`, mono code subtitle, info box `bg-muted/30 border-border/40 p-2.5`, hàng action 3 nút.

## Refactor GoogleAuthSignInCard

**Bỏ** layout amber + warning box dài + ordered list 4 bước hiển thị mặc định.

**Header (giống các card khác):**
- Icon Google (giữ SVG hiện tại) trong `p-2.5 rounded-lg bg-muted/60`
- Title: `Google Sign-In` (text-sm font-semibold)
- Subtitle mono: `google_signin (BYOK)`
- Badge top-right: `<Badge variant="secondary"><KeyRound/> BYOK</Badge>`

**Info box (thay warning amber):**
```
Provider     Google Cloud Console
Redirect     ...supabase.co/auth/v1/callback  [Copy]
Trạng thái   OAuth Client riêng của Flowa
```
Dùng cùng class `text-xs text-muted-foreground rounded-md bg-muted/30 border-border/40 p-2.5`.

**Hàng action (giống các card credentials):**
- `[Cấu hình]` (default/outline) → mở Auth Providers dashboard (external link)
- `[⚡ Test]` → mở `/auth` tab mới
- `[ⓘ Hướng dẫn]` (ghost icon) → mở Popover/Dialog chứa 4 bước recovery + link Google Console (giấu chi tiết khỏi card chính, chỉ hiện khi cần)

## Files
- **Edit only:** `src/components/admin/GoogleAuthSignInCard.tsx`
- Không đổi `AdminSocialSettings.tsx` (vẫn render ở section "Đăng nhập ứng dụng" như hiện tại).

## Out of scope
- Không tạo platform entry trong `PLATFORMS` (vì không lưu DB).
- Không thay đổi flow OAuth thật.
- Không đổi theme tokens.
