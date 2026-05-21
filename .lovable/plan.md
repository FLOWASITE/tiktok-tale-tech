## Mục tiêu
Tạm tắt tính năng **Chấm GEO** trên toàn app để tránh gọi `geo-score-content` (đang lỗi DashScope 400 / IDLE_TIMEOUT 504) và tránh tốn credit, nhưng **giữ nguyên code** để bật lại dễ dàng sau này.

## Phạm vi (frontend-only, không đụng edge function/DB)

1. **Thêm flag tắt cứng** `src/lib/featureFlags.ts` (tạo mới hoặc thêm vào file flags hiện có nếu có):
   ```ts
   export const GEO_SCORING_ENABLED = false;
   ```

2. **`src/hooks/useMultiChannelContents.ts`** — short-circuit `triggerAutoGEOScore`:
   - Đầu hàm `triggerAutoGEOScore` (line ~111): `if (!GEO_SCORING_ENABLED) return;`
   - Auto-trigger sau generate/regenerate/update không còn gọi edge.

3. **`src/components/MultiChannelViewer.tsx`**:
   - Auto-trigger GEO effect (line ~388–416): `if (!GEO_SCORING_ENABLED) return;` ở đầu.
   - `handleTriggerGEO` (line ~419): early return + toast "Tính năng Chấm GEO đang tạm khóa".
   - Nút toggle GEO Score (line ~1093–1105): ẩn nút (`{GEO_SCORING_ENABLED && ...}`) — không hiển thị panel & nút bấm.
   - `<GEOScorePanel>` render (line ~1258): wrap `{GEO_SCORING_ENABLED && <GEOScorePanel ... />}`.
   - Prop `onTriggerGEO`/`isGEOLoading` (line ~1833) giữ nguyên (no-op khi flag off).

4. **`src/pages/GEODashboard.tsx`** — ẩn tab **GEO Score**:
   - Khi `!GEO_SCORING_ENABLED`: bỏ `<TabsTrigger value="optimizer">` và `<TabsContent value="optimizer">`; đổi `grid-cols-6` → `grid-cols-5`.
   - Các tab còn lại (Tổng quan, Prompts, Đối thủ, Actions, Cấu hình) vẫn hoạt động bình thường vì chúng không gọi `geo-score-content`.

5. **`src/components/geo/GEOContentOptimizerTab.tsx`** — không cần sửa (tab đã ẩn ở bước 4). `GEOScorePanel` component giữ nguyên.

## Không làm
- Không xóa code GEO, không sửa edge function `geo-score-content`, không sửa DB/RLS.
- Không đổi DashScope/ai-provider (lỗi DashScope arrears đã được fallback ở turn trước).
- `AgentDirectoryPage.tsx` chỉ là text mô tả → giữ nguyên.

## Bật lại
Đổi `GEO_SCORING_ENABLED = true` trong 1 file là xong.

## Verify
- Mở `/multichannel` → không còn auto-call `geo-score-content` (Network tab sạch), không còn lỗi 504/500.
- Mở Viewer 1 content → không thấy nút/panel GEO Score.
- Vào `/geo` (GEO Engine) → tab "GEO Score" biến mất, các tab khác vẫn vào được.
