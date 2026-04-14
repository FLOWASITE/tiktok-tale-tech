

## Thêm mục "Quản lý tài khoản" vào Menu Profile

### Thay đổi

Thêm một `DropdownMenuItem` "Quản lý tài khoản" với icon `User` vào dropdown menu của `UserAvatar`, đặt ngay sau phần Organization settings (dòng 217), trước separator Preferences.

### Kỹ thuật

**File sửa:** `src/components/UserAvatar.tsx`

- Thêm menu item mới sau block `isAdmin && Admin Dashboard` (dòng 217):
```tsx
<DropdownMenuItem onClick={() => navigate('/account')} className="gap-2 rounded-sm">
  <User className="h-4 w-4 text-muted-foreground" />
  <span className="text-sm">Quản lý tài khoản</span>
</DropdownMenuItem>
```

Icon `User` đã được import sẵn. Không cần thêm file hay route mới.

