

## Sửa triệt để màu hồng đỏ còn sót

### Nguyên nhân gốc
Biến CSS `--accent` đang set bằng `340 82% 52%` (hồng đỏ TikTok) — giống hệt `--primary`. Mà tất cả dropdown menu items dùng `focus:bg-accent`, conversation items dùng `bg-accent`, search input dùng `focus-visible:bg-accent/50` → đều bị hồng.

Ngoài ra `--ring` cũng là `340 82% 52%` → focus ring hồng.

### Giải pháp

**`src/index.css`** — Đổi 4 biến trong cả light và dark theme:

**Light mode:**
- `--accent: 340 82% 52%` → `--accent: 240 4.8% 95.9%` (neutral gray, giống `--muted`)
- `--accent-foreground: 0 0% 98%` → `--accent-foreground: 240 5.9% 10%` (dark text)
- `--ring: 340 82% 52%` → `--ring: 240 5% 65%` (neutral ring)

**Dark mode:**
- `--accent: 340 82% 52%` → `--accent: 240 3.7% 15.9%` (neutral dark gray)
- `--accent-foreground: 0 0% 98%` → `--accent-foreground: 0 0% 98%` (giữ nguyên)
- `--ring: 340 82% 52%` → `--ring: 240 5% 34%`

Cũng đổi `--sidebar-ring` từ hồng sang neutral trong cả 2 mode.

### Kết quả
- Dropdown menu hover/focus → xám nhẹ thay vì hồng đỏ
- Sidebar conversation active → xám nhẹ
- Search input focus → không viền hồng
- Focus ring toàn app → neutral thay vì hồng
- Primary color vẫn giữ nguyên cho các nút CTA chính đáng (Send button, etc.)

