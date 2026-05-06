# Cải thiện UI "AI tạo nhân vật từ Brand"

## Vấn đề hiện tại (xem screenshot)
1. Nút CTA hồng đậm full-width — **vi phạm Soft Luxury** (memory: neutral gray accents)
2. Header phẳng, icon Sparkles bé, không tận dụng visual hierarchy
3. "Số lượng" dùng Select dropdown cho 4 lựa chọn — thừa, nên segmented
4. Thiếu **quick role chips** — user phải tự gõ "Bác sĩ tư vấn, KOL review…" mỗi lần
5. Thiếu lựa chọn **vai mặc định** (chính/phụ) — vừa thêm field `default_role` vào DB nhưng AI bulk-create luôn set `supporting`
6. Không hiển thị **brand context** (industry, tone, audience) — user mù về việc AI sẽ "phân tích" cái gì
7. Empty state trống trải, message "Đã có 1 nhân vật" lạc lõng dưới card
8. Card kết quả (sau khi AI tạo) checkbox HTML thô, không match design system

## Thay đổi UI

### Header (gradient soft)
```
┌─────────────────────────────────────┐
│ [✨ icon trong ring gradient nhẹ]   │
│ AI tạo nhân vật từ Brand            │
│                                      │
│ [chip: Flowa] [chip: Beauty Tech]   │
│ [chip: Tone chuyên nghiệp]          │
└─────────────────────────────────────┘
```
- Icon Sparkles 32px trong ring `bg-muted/40 ring-1 ring-border`
- Brand chips hiển thị: tên brand + industry + tone (lấy từ `brand.industry`, `brand.tone_of_voice[0]`)
- Bỏ description verbose, chỉ giữ 1 dòng ngắn

### Form body
1. **Quick role chips** (above input): `Bác sĩ` `KOL` `Khách hàng thật` `Chuyên gia` `Mentor` `Founder` — click → fill input + có thể edit thêm
2. **Số lượng**: thay Select bằng **segmented buttons** 1 / 2 / 3 / 4 (4 ô vuông `h-9`, active = `bg-foreground text-background`)
3. **Vai mặc định** (mới): segmented `Vai chính` ⭐ / `Vai phụ` (default: phụ vì bulk thường tạo phụ); set `default_role` khi `onCreateProfile`
4. **Auto-gen ảnh**: giữ nguyên card nhưng đổi switch màu neutral (Soft Luxury), thêm badge "+1 credit/nhân vật" bên cạnh
5. **Existing count**: chuyển thành chip nhỏ inline `· Đã có 1 nhân vật, AI sẽ tránh trùng` ngay dưới header thay vì block riêng

### CTA primary
- Đổi từ `bg-primary` (pink) → `bg-foreground text-background hover:bg-foreground/90` (neutral đen, đúng Soft Luxury)
- Icon Sparkles + "Tạo nhân vật"
- Khi `generating`: shimmer subtle + "Đang phân tích brand…"

### Generated chars cards (sau khi AI trả)
- Bỏ `<input type="checkbox">` HTML thô → dùng `<Checkbox>` từ shadcn/ui
- Card có avatar placeholder tròn (initial từ name) ở trái
- Badge `Vai chính`/`Vai phụ` góc phải nếu user chọn vai
- Hover: subtle ring `ring-1 ring-border` thay vì đổi background
- Footer 2 button: `Tạo lại` ghost + `Lưu N nhân vật` neutral

### Loading skeleton
Khi `generating === true`, hiển thị 2-3 skeleton card mờ thay vì chỉ button spinner → cảm giác AI đang "làm việc"

## Files thay đổi
- `src/components/characters/AIBulkGenerateSheet.tsx` — redesign toàn bộ JSX, thêm state `defaultRole`, quick role chips, brand context chips
- Có thể cần đọc `useBrandTemplates` hoặc prop `brand` mở rộng để lấy `industry` + `tone_of_voice` (nếu chưa có sẽ chỉ hiển thị tên)

## Không làm
- Không đụng logic edge function `generate-character`
- Không thay đổi behavior `onCreateProfile` (chỉ thêm `default_role` vào payload)
- Không refactor file khác
