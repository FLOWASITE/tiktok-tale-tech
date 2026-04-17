
Add a "Kết nối kênh" (Connect Channel) button at the bottom of the brand switcher dropdown, next to/after the existing "Quản lý Brand" item — in the empty space shown by the red box.

### Change
**`src/components/HeaderBrandSwitcher.tsx`**
- Add a new `DropdownMenuItem` after "Quản lý Brand" that navigates to `/connections` (or the channel connection route).
- Use `Link2` or `Plug` icon from lucide-react for visual clarity.
- Keep same muted styling as "Quản lý Brand" for consistency.

```tsx
<DropdownMenuItem
  onClick={() => navigate('/connections')}
  className="flex items-center gap-2 text-muted-foreground"
>
  <Link2 className="w-4 h-4" />
  <span>Kết nối kênh</span>
</DropdownMenuItem>
```

### Question
Route đúng cho trang kết nối kênh là gì? Tôi sẽ dùng `/connections` mặc định — nếu khác (vd `/social-connections`, `/integrations`) bạn báo lại nhé.
