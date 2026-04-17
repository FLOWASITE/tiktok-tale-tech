

## Goal
Move all "Cài đặt tổ chức" features into "Quản lý tài khoản" (Account page), so the Profile dropdown has only one entry for both personal + organization management.

## Approach
Restructure `/account` into a tabbed layout combining personal info + organization settings. Keep `/organization` route working as an alias (redirect or render same page with tab preselected) for backwards compatibility.

### 1. `src/pages/Account.tsx` — Add Tabs
Wrap existing content in a `Tabs` layout with 3 tabs:
- **Cá nhân** (default): existing Profile + Subscription + Usage + History + Payment cards
- **Tổ chức**: members list + approval settings + org info (name, logo, color, danger zone) — port from `OrganizationSettings.tsx`
- Use `useSearchParams` to support `?tab=organization` deep-linking

Reuse existing components: `OrganizationStats`, `OrganizationMembersList`, `ApprovalSettingsCard`, hooks `useOrganization`, `useOrganizationMembers`, `useMultiChannelContents`.

### 2. `src/pages/OrganizationSettings.tsx` — Convert to redirect
Replace the page body with a `<Navigate to="/account?tab=organization" replace />` so all existing links keep working without breaking.

### 3. `src/components/UserAvatar.tsx` — Clean dropdown
Remove the standalone "Cài đặt tổ chức" `DropdownMenuItem` (lines 205-210). Keep "Quản lý tài khoản" — it now leads to the unified page.

Optionally update the org sub-menu's items so "Tổ chức hiện tại" rows still navigate to `/account?tab=organization` on click.

## Result
- One single entry point: **Quản lý tài khoản** → tabs cho Cá nhân / Tổ chức
- Dropdown gọn hơn, không trùng lặp
- Old `/organization` URL vẫn hoạt động (redirect)
- Không mất bất kỳ chức năng nào (members, approval, logo, primary color, danger zone đều có mặt)

