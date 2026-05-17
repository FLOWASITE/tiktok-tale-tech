## Mục tiêu
Biến khối "Lịch nội dung chi tiết" ở Step Xác nhận thành **Content Schedule Studio** thực thụ: AI sinh topic thật cho từng slot, có giờ đăng + loại content, hai view (List/Calendar), edit đầy đủ, filter + stats + export, và plan đã edit được dùng trực tiếp khi tạo campaign (không bị AI sinh lại).

## Kiến trúc

### Backend
Tái dùng `generate-campaign-strategy` (đã trả ra schema `pieces[]` đầy đủ: `piece_number, title, angle, content_type, target_channel, content_role, scheduled_date, format, key_message, estimated_length`). Thêm 2 thay đổi nhỏ:
1. **Preview mode** — accept query/body flag `preview: true` → trả pieces nhưng KHÔNG insert `campaign_content_plans` vào DB.
2. **Pre-generated plan mode** — nếu request gửi `pre_generated_plan: Piece[]` → bỏ qua AI call, validate schema, dùng pieces này tạo plan record.

Thêm fields output đã có ngầm: `recommended_time` (HH:mm) và `format` (đã có). Bổ sung trong prompt: yêu cầu AI suggest giờ vàng theo platform (FB 19:30, IG 20:00, LinkedIn 09:00, Threads 12:00, Pinterest 21:00, blog 09:30…).

### Frontend
Component mới `src/components/agents/ContentScheduleStudio.tsx`:

**Props**: `pieces, onChange, onRegenerate, onAIRewriteRow, channels[], pillars[], startDate, duration, isGenerating`

**Bộ phận**:
1. **Header bar** — title + count + 3 nút:
   - View toggle: `List | Calendar` (Tabs)
   - `↻ AI sinh lại` (call edge function full lại)
   - `⬇ Export` (Popover: CSV / Markdown / Copy clipboard)
2. **Filter row** — chips: Channel multi-select, Pillar multi-select, Content type (post/carousel/video), Date range slider; nút "Clear".
3. **Stats strip** (sticky) — 4 mini cards: Total bài · Channels distribution (mini bar) · Pillar distribution (mini bar) · Cảnh báo (ngày >3 bài highlighted đỏ).
4. **List view** — table dense với columns: Date · Time · Channel · Type · Pillar · Title · Actions (⋯).
   - Cell title: click → inline input edit. Enter save / Esc cancel.
   - Cell date: click → DatePicker popover.
   - Cell time: click → time input.
   - Cell channel/pillar/type: click → Select popover.
   - Actions menu: ✨ "AI viết lại dòng này" · 🗑 Xoá · 📋 Duplicate.
   - Nút "+ Thêm bài" cuối mỗi nhóm tuần.
5. **Calendar view** — grid 7 cột (T2..CN), mỗi ô = 1 ngày, list chip mini (channel icon + title 1 dòng truncate, màu theo pillar). Click chip → mở edit drawer. Click ô trống → "+ Thêm bài vào ngày này". Quá 3 chip → "+N more" mở day-detail popover. Hỗ trợ kéo-thả chip giữa ô (HTML5 drag) → đổi `scheduled_date`.
6. **Empty/loading states** — skeleton rows khi generating; empty state với CTA "Tạo lịch bằng AI".

### Tích hợp vào GoalWizard
1. Thêm state:
   - `editableSchedule: Piece[] | null`
   - `scheduleStudioOpen: boolean` (mặc định true ở Step 4)
   - `aiScheduleStatus: 'idle' | 'generating' | 'ready' | 'error'`
2. **Auto-trigger 1 lần** khi user vào Step 4 lần đầu nếu `editableSchedule == null` và `selectedChannels.length > 0 && pillars set`:
   - Gọi `generate-campaign-strategy` với `preview: true` + đầy đủ context (brand, objectives, channels, frequency, pillarAllocation, keyMessages, primaryCta, duration, startDate, kpiTargets).
   - Loading state: thay khối schedule cũ bằng skeleton + tiến trình "AI đang sinh 24 bài…".
   - Nếu lỗi (402/429/timeout) → fallback về deterministic schedule cũ + toast lỗi + nút "Thử lại".
3. **Khi user back về Step trước rồi sửa channels/pillars** → đánh dấu `editableSchedule` stale (badge "Cần làm mới" + nút "↻ Sinh lại").
4. **Submit** (`handleSubmit`): nếu `editableSchedule` có → gửi `pre_generated_plan: editableSchedule` vào generate-campaign-strategy → server skip AI, insert luôn.

### Hook mới
`src/hooks/agents/usePreviewSchedule.ts` — wrap mutation `generate-campaign-strategy` với `preview: true`.
`src/hooks/agents/useRewritePiece.ts` — gọi `suggest-piece-topics` (đã có) cho 1 row, trả `{title, hook, key_message}`.

## Export logic (client-side)
- **CSV** — UTF-8 BOM + columns: Ngày, Giờ, Thứ, Kênh, Loại, Pillar, Tiêu đề, Key Message, Angle.
- **Markdown** — bảng MD group theo tuần.
- **Copy** — same markdown vào clipboard, toast confirm.

## Stats logic
- `pieceByChannel: Map<channel, count>` → mini bar dài tỉ lệ.
- `pieceByPillar` tương tự.
- `overloadDays`: Map<dateStr, count> → day có >3 bài highlight đỏ trong cả List header tuần lẫn Calendar ô.
- `gaps`: ngày không có bài giữa các bài → cảnh báo "5 ngày trống liên tiếp".

## File changes
**New**
- `src/components/agents/ContentScheduleStudio.tsx` (main editor, ~600 lines)
- `src/components/agents/schedule/ScheduleListView.tsx` (~250 lines)
- `src/components/agents/schedule/ScheduleCalendarView.tsx` (~200 lines)
- `src/components/agents/schedule/ScheduleStatsBar.tsx` (~80 lines)
- `src/components/agents/schedule/ScheduleExportMenu.tsx` (~120 lines)
- `src/hooks/agents/usePreviewSchedule.ts`
- `src/hooks/agents/useRewritePiece.ts`
- `src/lib/scheduleExport.ts` (CSV/MD builder)

**Edit**
- `src/components/agents/GoalWizard.tsx` — bỏ khối schedule cũ (~190 lines vừa thêm), thay bằng `<ContentScheduleStudio>` + state + auto-trigger effect + submit logic.
- `supabase/functions/generate-campaign-strategy/index.ts` — thêm `preview` + `pre_generated_plan` branch + giờ vàng trong prompt + validation pre_generated_plan với Zod.

**Test**
- `supabase/functions/generate-campaign-strategy/__tests__/preview-mode.test.ts` — verify preview không insert + pre_generated_plan insert thẳng.

## Edge cases
- `selectedChannels` đổi sau khi đã có schedule → diff: pieces của channel bị bỏ chọn → mark "Sẽ bị xoá" (gạch ngang) + nút "Áp dụng" để cleanup. Channel mới thêm → không tự thêm bài, user phải bấm "AI bổ sung kênh mới".
- Edit ngày ra ngoài `[startDate, endDate]` → warning toast nhưng vẫn cho phép.
- Drag-drop trên mobile (viewport 707px) → disable, hiển thị nút "Đổi ngày" trong actions menu.
- Export khi chưa generate → disabled với tooltip.

## Out of scope
- Không sync real-time tới Calendar page khác (chỉ persist khi submit campaign).
- Không support reorder trong cùng ngày (chỉ swap ngày).
- Không AI rewrite hàng loạt (chỉ per-row hoặc full); muốn rewrite nhiều thì bấm "↻ AI sinh lại".

## UX flow mới
```
Step 4 mở
  ↓
[Auto] gọi generate-campaign-strategy {preview:true}
  ↓ ~3-8s với skeleton
Hiện ContentScheduleStudio (List view mặc định)
  ↓
User filter / sửa / kéo-thả / + thêm / xoá
  ↓
Bấm "Tạo Campaign"
  ↓
Submit với pre_generated_plan = editableSchedule
  ↓
Server insert plan ngay, không AI lại
```