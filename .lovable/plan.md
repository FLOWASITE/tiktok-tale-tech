## Mục tiêu
Thêm vào Step "Xác nhận" của `GoalWizard` một **Lịch nội dung chi tiết theo ngày** — mỗi dòng = 1 bài: Ngày + Kênh + Trụ cột nội dung + Gợi ý chủ đề/angle, để user thấy rõ campaign sẽ chạy ra sao trước khi tạo.

## Vị trí
Chèn ngay sau khối "Kênh & Tần suất" (~line 1838) trong `src/components/agents/GoalWizard.tsx`, trước "KPI Mục tiêu".

## Cách build lịch (deterministic, client-side, không gọi AI)
Tạo helper `buildContentSchedule()` trong component, dùng dữ liệu sẵn có:
- **Input**: `selectedChannels`, `frequency`, `pillarAllocation`, `effectiveDuration`, `campaignStartDate`, `aiSuggestedTopics`/`campaignName`.
- **Bước 1 — Sinh slot cho từng kênh**: với mỗi channel, dùng `freqPerWeek` (daily=7, 3/week=[T2,T4,T6], 2/week=[T3,T5], weekly=[T3]) → ra danh sách ngày cụ thể trong khoảng `[start, start+duration)`.
- **Bước 2 — Gán pillar (round-robin theo tỉ lệ)**: tạo "pillar pool" theo weight (vd Educate 50/Inspire 30/Sell 20 → mảng E,E,E,E,E,I,I,I,S,S) rồi shuffle ổn định (seed = campaignName) → gán tuần tự cho từng slot.
- **Bước 3 — Gợi ý chủ đề**: 
  - Nếu có `aiSuggestedTopics` (mảng topic AI gợi) → cycle qua list.
  - Fallback: template `"{Pillar} • {channelLabel} #${index}"` (vd "Educate • Instagram #1").
- **Bước 4 — Sort theo ngày tăng dần**, group theo tuần.

## UI rendering
Khối mới: collapsible card "Lịch nội dung chi tiết" (mở mặc định nếu `estimatedPosts ≤ 14`, đóng nếu nhiều hơn để tránh tràn).

```
┌─ 📅 Lịch nội dung chi tiết        [42 bài • 6 tuần]  ▼ ─┐
│  Tuần 1 (20/01 – 26/01)                          8 bài  │
│  ─────────────────────────────────────────────────────  │
│  T2 20/01  [IG]  Educate   "Quy trình filler an toàn"   │
│  T2 20/01  [FB]  Inspire   "Khách hàng trước/sau"       │
│  T4 22/01  [IG]  Sell      "Ưu đãi tháng 1"             │
│  ...                                                     │
│  Tuần 2 (27/01 – 02/02)                          7 bài  │
│  ...                                                     │
└─────────────────────────────────────────────────────────┘
```

Mỗi row:
- Cột 1: Thứ + dd/MM (w-16, text-[10px], text-muted-foreground, tabular-nums)
- Cột 2: `ChannelIcon` + label kênh (w-24, dùng `channelIconColors`)
- Cột 3: Pillar badge (variant outline, color theo pillar — Educate=blue/Inspire=violet/Sell=emerald, fallback muted)
- Cột 4: Topic gợi ý (flex-1, truncate, text-[11px])

Header tuần: `bg-muted/30 sticky top-0` trong vùng scroll, hiển thị range ngày + đếm bài.

Container: `max-h-[280px] overflow-y-auto` để tránh chiếm hết viewport (đặc biệt mobile 707px). Có nút "Xem tất cả" mở `Dialog` nếu user muốn xem full.

## Edge cases
- `estimatedPosts === 0` → không render khối này.
- `campaignStartDate` chưa set → dùng `new Date()` làm mặc định + ghi chú "(từ hôm nay)".
- Duration > 60 ngày → chỉ render 4 tuần đầu trong card, còn lại trong Dialog.
- Pillar pool rỗng → toàn bộ slot = "Mixed".

## Technical details
- Helper thuần (không hook), gọi trong cùng IIFE `(() => { ... })()` đã có ở Step Confirm để tránh re-render thừa.
- Date format: `date-fns` (`format(date, 'EEE dd/MM', { locale: vi })`) — package đã import sẵn ở các file khác.
- Seed shuffle: hash đơn giản từ `campaignName` (mulberry32) để mỗi lần render cùng campaign ra cùng thứ tự, nhưng campaign khác nhau ra layout khác.
- Pillar color map: thêm const local `pillarBadgeClass: Record<string, string>` với 3-4 màu semantic.
- Không thêm dependency mới, không sửa state/backend, không sửa schema.

## File chỉnh sửa
- `src/components/agents/GoalWizard.tsx` — chỉ JSX + helper trong Step 4.

## Out of scope
- Không persist lịch vào DB (chỉ preview UI; backend `generate-campaign-strategy` vẫn là nguồn truth khi user bấm "Tạo").
- Không cho phép edit từng slot ở bước này (sẽ làm ở Campaign Detail sau).