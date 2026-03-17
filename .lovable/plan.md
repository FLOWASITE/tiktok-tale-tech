

# Thêm Tooltip giải thích % hạn mức

## Thay đổi

### `src/components/AppSidebar.tsx` — Wrap progress bar trong Tooltip

Bọc toàn bộ `<button>` của `QuotaWarningIndicator` trong `TooltipProvider > Tooltip > TooltipTrigger/TooltipContent`.

**Tooltip content** sẽ hiển thị chi tiết từng metric:
- Scripts: X/Y (Z%)
- Carousels: X/Y (Z%)
- Đa kênh: X/Y (Z%)
- Ảnh AI: X/Y (Z%)
- Brands: X/Y (Z%)
- Trung bình: {avgPct}%

Dùng các component Tooltip đã có từ `@/components/ui/tooltip`.

| File | Thay đổi |
|---|---|
| `src/components/AppSidebar.tsx` | Wrap QuotaWarningIndicator button trong Tooltip với chi tiết từng metric |

