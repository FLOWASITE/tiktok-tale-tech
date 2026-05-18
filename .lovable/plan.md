
## Mục tiêu

Click vào dòng nội dung trong `CampaignPlanReview` (cả 3 view: Danh sách / Timeline / Theo kênh) → mở đúng studio tương ứng với `format` của piece, prefill dữ liệu cơ bản (title, key_message, channel, brand, date).

Hôm nay row chỉ có icon Pencil (mở dialog sửa metadata) và Trash. Hành vi mới: **toàn bộ row clickable** → navigate, icon vẫn giữ nguyên để sửa nhanh tại chỗ.

## Mapping format → đích đến

| `piece.format` | `piece.target_channel` | Điều hướng |
|---|---|---|
| `carousel` | bất kỳ | `/carousel?title=…&channel=…&brand=…&pieceId=…&planId=…` |
| `video_script` | bất kỳ | `/videos?tab=scripts&title=…&channel=…&brand=…&pieceId=…&planId=…` |
| `post` | `website / wordpress / blogger` | `/multichannel/new?channels=<channel>&title=…&brand=…&pieceId=…&planId=…` (long-form) |
| `post` | còn lại (FB/IG/Threads/LinkedIn/X/Pinterest/Zalo/TikTok) | `/multichannel/new?channels=<channel>&title=…&brand=…&pieceId=…&planId=…` |
| `email` | — | `/multichannel/new?channels=email&title=…&brand=…&pieceId=…&planId=…` |

Nếu `piece.pipeline_id` đã có và pipeline có `content_id` → ưu tiên mở content đã tạo:
- carousel: `/carousel?id=<content_id>`
- multichannel/email/post: `/multichannel?id=<content_id>` (xem chi tiết)
- video_script: `/videos?tab=scripts&id=<content_id>`

Nếu chưa có → vào trang "new" với prefill.

## Implementation

### 1. File mới `src/lib/campaignPieceNav.ts`

Hàm thuần `getPieceTarget(piece, ctx)`:
- Input: `piece: CampaignContentPiece`, `ctx: { planId, brandTemplateId, organizationId, pipelineContentId? }`
- Output: `{ path: string }` (URL có sẵn query params)

Logic:
- Nếu `pipelineContentId` → trả route "view existing" theo bảng trên.
- Ngược lại build route "new" + query: `title`, `key_message`, `channels` (mảng → join `,`), `brand`, `pieceId`, `planId`, `scheduledDate`.

Export thêm `CHANNEL_TO_LONGFORM` helper nếu cần phân biệt long-form vs social (nhưng cùng dùng `/multichannel/new`, chỉ khác kênh truyền).

### 2. Optional fetch pipeline.content_id

`CampaignPlanReview` đã có `pieces`. Mỗi piece có `pipeline_id` nullable.

Tạo hook nhỏ `useCampaignPieceContentIds(pieces)`:
- Lọc piece có `pipeline_id` → 1 query Supabase `agent_pipelines` `select('id, content_id, content_type').in('id', ids)` → return `Map<pipelineId, {content_id, content_type}>`.
- Trả về `{ getContentId(pieceNumber): string | null }`.

(Nếu hook overhead, skip phase 1: luôn route sang trang "new" với prefill. Vẫn ổn vì agent đã có `content_id` trong pipeline state UI khác.)

### 3. Sửa `CampaignPlanReview.tsx`

- Import `useNavigate` từ `react-router-dom`, import `getPieceTarget`.
- Thêm prop `onPieceOpen?: (piece) => void` (default = navigate dùng `getPieceTarget`).
- Truyền `onOpen` xuống `ListView`, `TimelineView`, `ChannelView` (và `PieceCard`).
- Trong row của mỗi view: wrap nội dung trong `<button onClick={() => onOpen(piece)}>` HOẶC thêm `onClick` cho `<Card>` / row `<div>` + `cursor-pointer`, `role="button"`, `tabIndex={0}`, keydown Enter.
- Nút Pencil/Trash phải `e.stopPropagation()` để không trigger navigate.
- Trong dialog edit hiện tại (`Pencil`) giữ nguyên.

### 4. Edit dialog

Không đổi. Vẫn mở qua nút Pencil. Click thẳng row = navigate sang Content Studio.

## Visual hint

- Toàn row: thêm `cursor-pointer` + hover ring đậm hơn (đã có `hover:border-primary/30`).
- Thêm `ChevronRight` nhỏ ở cuối row (chỉ List/Timeline) khi hover để báo "mở".
- Tooltip ngắn: `Mở Content Studio` (i18n vi).

## Edge cases

- Piece không có `target_channel` hoặc `format` lạ → fallback `/multichannel/new?title=…`.
- `brandTemplateId` null → bỏ qua param `brand`.
- `email` format và channel không phải email → vẫn dùng channel của piece (không ép `email`).

## Không đổi

- Backend, DB, RLS, generate-* edge functions: zero changes.
- Dialog edit + Pencil + Trash + Suggest popover: y nguyên.
- Layout / 3 view mode toggle / progress bar: y nguyên.

## Files sửa

- **Tạo:** `src/lib/campaignPieceNav.ts` (~60 dòng, thuần function).
- **Sửa:** `src/components/agents/CampaignPlanReview.tsx`
  - Import `useNavigate` + `getPieceTarget` + `ChevronRight`.
  - Thêm handler `handleOpenPiece(piece)`.
  - Wrap row trong 3 view (`ListView` lines 341–389, `TimelineView` lines 271–298, `PieceCard` lines 108–166) với `onClick` + `stopPropagation` cho nút.
- **(Optional)** `src/hooks/agents/useCampaignPieceContentIds.ts` nếu muốn route sang content đã generate.

Tổng: 2–3 file, không đụng backend.
