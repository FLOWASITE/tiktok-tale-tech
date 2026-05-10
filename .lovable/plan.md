## Mục tiêu
Thêm nút đóng/mở (collapse) cho **panel sidebar "Danh mục"** (cột trái) trong `IndustryBrowserV2.tsx` — vùng khoanh đỏ trong screenshot. Khi đóng, panel thu lại để Main Content (Industry Packs) chiếm full chiều ngang, hữu ích trên màn hẹp 707px.

## Thay đổi

### `src/components/admin/IndustryBrowserV2.tsx`

**State mới (gần đầu component):**
```tsx
const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
```

**Header sidebar (dòng ~462-467):** thêm nút toggle bên phải tiêu đề
- `CardHeader` đổi sang `flex items-center justify-between`
- Nút icon-only dùng `ChevronLeft` (khi mở) / `ChevronRight` (khi đóng), `variant="ghost" size="icon"` `h-7 w-7`
- `aria-label="Đóng danh mục"` / `"Mở danh mục"`

**Wrapper sidebar (dòng 461):** width động
- Mở: `w-72 flex-shrink-0`
- Đóng: `w-12 flex-shrink-0` — chỉ hiện icon `FolderTree` + nút mở rộng, ẩn `ScrollArea` content
- Dùng `transition-[width] duration-200`

**Khi `sidebarCollapsed === true`:**
- Ẩn `CardTitle` text "Danh mục (N)" và toàn bộ `CardContent`
- Chỉ render nút expand (ChevronRight) + icon FolderTree căn giữa

**Persistence (tùy chọn nhỏ):** lưu `localStorage.setItem('industryBrowser.sidebarCollapsed', ...)` để giữ trạng thái qua reload.

## Out of scope
- Không đổi logic filter, query, category data
- Không động đến tab Categories ở `AdminIndustryPacks.tsx` (panel kia đã có collapse từ message trước)
- Không refactor responsive layout tổng thể

## Verify
- Click nút → sidebar thu về `w-12`, Main Content giãn ra
- Click lại → trở về `w-72`, danh mục hiện đầy đủ
- Reload trang giữ nguyên trạng thái (nếu thêm localStorage)
- 707px viewport: khi đóng có thêm chỗ thở cho danh sách packs
