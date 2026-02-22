
# Fix Dropdown Model Selection bi tran man hinh tren mobile

## Van de
Dropdown chon model trong FunctionCard.tsx co qua nhieu items (OpenRouter 6 models + Lovable AI 3 presets + Extra presets 2 + Custom + Cau hinh chi tiet = 12+ items). Tren mobile, dropdown bi tran ra ngoai viewport, phan tren bi cat mat (khong thay duoc header "OpenRouter" va cac model dau tien nhu DeepSeek, MiniMax, Kimi).

## Giai phap
Them `className` voi `max-height` va `overflow-y: auto` cho `DropdownMenuContent` de dropdown co the scroll duoc khi noi dung vuot qua chieu cao man hinh.

## Chi tiet ky thuat

### File: `src/components/admin/ai/FunctionCard.tsx`

**1. Compact view dropdown (line 302):**
- Them `max-h-[70vh] overflow-y-auto` vao className cua `DropdownMenuContent`
- Tu: `className="w-56"`
- Thanh: `className="w-56 max-h-[70vh] overflow-y-auto"`

**2. Expanded view "More" dropdown (line 563):**
- Tuong tu, them `max-h-[70vh] overflow-y-auto`
- Tu: `className="w-56"`
- Thanh: `className="w-56 max-h-[70vh] overflow-y-auto"`

Voi thay doi nay, dropdown se co thanh cuon (scrollbar) khi noi dung vuot qua 70% chieu cao viewport, dam bao tat ca items deu co the truy cap duoc tren moi kich thuoc man hinh.
