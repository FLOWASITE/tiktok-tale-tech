

## Thêm badge "Số kết nối" vào Brand Hero

### Thay đổi

**File: `src/components/brand/BrandViewHero.tsx`**
- Import `Link2` icon từ lucide-react và `useSocialConnections` hook
- Gọi `useSocialConnections({ brandTemplateId: template.id })` để lấy số kết nối active
- Thêm badge mới sau badge "Trang trọng", hiển thị số kết nối (VD: "2 Kết nối"), style tương tự các badge khác (màu xanh khi có kết nối, xám khi chưa có)

### Vị trí badge
Sau badge Formality ("Trang trọng"), trước badge Emoji — đúng chỗ khoanh đỏ trong ảnh.

### Chi tiết kỹ thuật
```tsx
// Thêm badge connections count (sau formality, trước emoji)
<div className={cn(
  "flex items-center gap-1.5 px-3 py-1.5 rounded-full border shadow-sm",
  connectionsCount > 0 
    ? "bg-sky-500/10 border-sky-500/30" 
    : "bg-background/80 border-border/50"
)}>
  <Link2 className={cn("w-3.5 h-3.5", connectionsCount > 0 ? "text-sky-600" : "text-muted-foreground")} />
  <span className="text-xs">{connectionsCount} Kết nối</span>
</div>
```

Chỉ thay đổi 1 file.

