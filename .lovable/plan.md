## Plan: Nâng cấp Structured Overlay để tiến gần hơn đến ảnh mẫu

### Mục tiêu

Mở rộng `overlay-text-canvas` (Satori) để hỗ trợ các layout phức tạp hơn, đưa khả năng từ ~35% lên ~65% so với ảnh mẫu. Tập trung vào 3 cải tiến có ROI cao nhất.

### Giới hạn thực tế

Ảnh mẫu là graphic design chuyên nghiệp. Hệ thống AI + programmatic overlay **không thể đạt 100%** — các yếu tố như decorative 3D assets (tiền xu, máy tính), multi-image composite cần công cụ thiết kế chuyên dụng. Plan này tập trung vào những gì Satori có thể render.

### Thay đổi

**1. Thêm element type "footer" cho contact bar** 
`supabase/functions/overlay-text-canvas/index.ts`

- Thêm `footer` vào `StructuredElements` interface: `{ items: Array<{ icon?: string; text: string }> }`
- Render dưới dạng flex row ở bottom, mỗi item có text nhỏ (fontSize ~2% imageWidth)
- Icon dùng emoji hoặc unicode symbol (📍📞🌐📧) — không cần asset riêng

**2. Hỗ trợ layout 2 cột (split layout)**
`supabase/functions/overlay-text-canvas/index.ts`

- Thêm optional `layout` field vào `StructuredOverlayRequest`: `'stack' | 'split'` (default `'stack'`)
- Khi `layout = 'split'`: wrap hero/headline bên trái (50-60%), cards bên phải (40-50%) dùng flexbox `flexDirection: 'row'`
- Banner + footer vẫn full-width ở top/bottom

**3. Thêm emoji/icon prefix cho cards**
`supabase/functions/overlay-text-canvas/index.ts`

- Mở rộng card item từ `{ label, value }` thành `{ icon?: string; label; value }`
- Render icon (emoji) trước label text, fontSize lớn hơn (~1.5x)

**4. Cập nhật AI decomposition để sinh layout mới**
`supabase/functions/generate-brand-image/index.ts` (hoặc nơi `decomposeRequest` được gọi)

- Khi nội dung có ≥3 bullet points/features → suggest `layout: 'split'`
- Sinh `footer.items` từ thông tin liên hệ nếu có trong content

&nbsp;

&nbsp;

### Không làm trong scope này

- Decorative 3D assets (tiền xu, máy tính) — cần image compositing engine riêng
- Multi-color headline (trắng + vàng trong 1 dòng) — Satori hỗ trợ nhưng cần refactor heroText thành rich text, phức tạp
- Gradient backgrounds trên text — low priority

### Kết quả kỳ vọng

Sau cải tiến, hệ thống có thể tạo ảnh có: banner top + headline trái + cards có icon phải + footer contact + 2 logo, trên nền AI-generated — đạt ~60-65% chất lượng visual so với ảnh mẫu.