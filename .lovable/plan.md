

# Di chuyển Theme Toggle vào Menu Profile

## Thay đổi

### 1. `src/components/UserAvatar.tsx`
- Import `useTheme` từ `next-themes` và các icon `Sun, Moon, Leaf, Monitor, Check`
- Thêm một `DropdownMenuSub` cho Theme Switcher (tương tự Language Switcher đã có), đặt ngay sau Language Switcher (trước "Trợ giúp")
- Sub-menu hiển thị 4 tùy chọn: Light, Dark, Lime, System — mỗi cái có icon + dấu Check nếu đang active

### 2. `src/components/AppLayout.tsx`
- Xóa `<ThemeToggle />` khỏi header (dòng `<div className="hidden sm:flex"><ThemeToggle /></div>`)
- Xóa import `ThemeToggle`

### 3. Cũng sửa lỗi build kèm theo
- **`package.json`**: Thêm `"overrides"` để fix xung đột `@types/react` (gây lỗi recharts, HelmetProvider, QueryClient)
- **`src/components/BrandForm.tsx` line 322**: Thay `supabase.auth.getUser()` bằng cách lấy user từ AuthContext

Tất cả lỗi build hiện tại đều cần được sửa để app chạy được.

