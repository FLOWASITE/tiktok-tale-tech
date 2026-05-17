# Đồng bộ số bài ở bước Xác nhận

## Vấn đề

Ở Step 4 (Xác nhận) trong `GoalWizard.tsx` có 2 con số "bài viết" lệch nhau:

1. **Hero metric "Bài viết"** (line 1960) = `estimatedPosts` — tính ở frontend: `Σ kênh round(duration × freqPerWeek/7)`. Ví dụ: 30 ngày × 5 kênh × daily → ~150 bài.
2. **Badge "Lịch nội dung chi tiết — N bài"** (line 2145) = `editableSchedule.length` — đến từ edge function `generate-campaign-strategy`, hàm này dùng `calculatePieceCount(durationDays)` **bỏ qua kênh + tần suất** → 30 ngày chỉ trả 8–12 bài.

Cùng campaign → frontend nói 150 bài, AI sinh 10 bài. User thấy mâu thuẫn ngay trong cùng 1 màn hình.

## Phạm vi

- Backend: `supabase/functions/generate-campaign-strategy/index.ts` — nhận target từ FE và bám sát.
- Frontend: `src/components/agents/GoalWizard.tsx` — gửi target và hiển thị nhất quán.

Không đụng pipeline, không đổi schema.

## Giải pháp

### 1. Backend: honor target count từ frontend

Trong `generate-campaign-strategy/index.ts`:

- Nhận thêm payload:
  ```ts
  target_post_count?: number;          // tổng số bài FE đã ước tính
  per_channel_targets?: Record<string, number>; // { facebook: 30, instagram: 12, ... }
  ```
- Sửa `calculatePieceCount(durationDays)`:
  - Nếu có `target_post_count` hợp lệ (1–200): `{ min: max(1, n-2), max: min(200, n+2) }`.
  - Nếu không có: giữ logic cũ.
- Cập nhật `buildStrategyPrompt`:
  - Khi có `per_channel_targets`, chèn block:
    ```
    CHANNEL DISTRIBUTION (MUST match these counts ±1):
    - facebook: 30 pieces
    - instagram: 12 pieces
    ...
    Total pieces: {target_post_count}
    ```
  - Thêm yêu cầu rõ ràng: "Sinh đúng {target_post_count} pieces, không ít hơn 90%, không quá 110%".
- Hard cap an toàn: nếu `target_post_count > 200` → clamp = 200 + flag warning trong response (`plan_warning: "Đã cắt còn 200 bài, ..."`).

### 2. Frontend: gửi target + hiển thị 1 nguồn sự thật

Trong `GoalWizard.tsx`:

**(a) Gửi target khi gọi preview** — `triggerSchedulePreview` (quanh line 414):
```ts
const perChannelTargets = Object.fromEntries(
  selectedChannels.map(ch => [ch, getChannelPosts(ch)])
);
await previewSchedule.run({
  ...,
  target_post_count: estimatedPosts,
  per_channel_targets: perChannelTargets,
});
```
→ Cập nhật type trong `src/hooks/agents/usePreviewSchedule.ts` (`PreviewRequest`).

**(b) Hero metric "Bài viết" hiển thị actual khi có schedule**:
- Tạo `actualPosts = editableSchedule?.length ?? null`.
- Hero card:
  - Khi `actualPosts != null && !scheduleStale`: hiện `actualPosts`, label "Bài viết".
  - Khi đang loading hoặc chưa có: hiện `estimatedPosts`, label "Bài viết (ước tính)" + dot pulse nhỏ.
  - Khi `scheduleStale`: hiện `estimatedPosts` + tooltip "Số ước tính – bấm Sinh lại để cập nhật".

**(c) Đồng bộ các số phái sinh**:
- `postsPerWeek` (line 1923): dùng `actualPosts ?? estimatedPosts`.
- Content Pillars `~ X bài` (line 2104): dùng `actualPosts ?? estimatedPosts`.
- Loading message (line 2172): "AI đang sinh ~{estimatedPosts} bài…" giữ nguyên (đó là ước tính trước khi có response).

**(d) Warning khi lệch >20%**:
- Nếu có cả 2 số và `|actual - estimated| / estimated > 0.2` → banner amber nhỏ dưới hero strip:
  > "AI sinh {actual} bài (bạn ước tính {estimated}). [Sinh lại với ràng buộc chặt hơn]" — nút gọi lại `triggerSchedulePreview` với cùng target.

### 3. Edge cases

- `estimatedPosts = 0` (chưa chọn kênh): không gửi target, edge function dùng default cũ.
- AI ignore target (sinh lệch >30%): vẫn render những gì AI trả về, banner cảnh báo để user biết.
- `scheduleStale = true` sau khi user đổi kênh/tần suất: hero quay lại estimatedPosts cho tới khi sinh lại.

## Files sẽ chỉnh

```text
supabase/functions/generate-campaign-strategy/index.ts
  ~ calculatePieceCount() — accept target
  ~ buildStrategyPrompt() — thêm CHANNEL DISTRIBUTION block khi có per_channel_targets
  ~ handler — đọc target_post_count, per_channel_targets từ body; clamp 200; trả plan_warning

src/hooks/agents/usePreviewSchedule.ts
  ~ PreviewRequest type — thêm target_post_count, per_channel_targets

src/components/agents/GoalWizard.tsx
  ~ triggerSchedulePreview() — truyền target_post_count + per_channel_targets
  ~ Hero metric "Bài viết" — dùng actualPosts với fallback estimatedPosts + label dynamic
  ~ postsPerWeek + Content Pillars — dùng actualPosts ?? estimatedPosts
  + Banner cảnh báo lệch >20% (chỉ render khi có cả 2 số)
```

## Không làm

- Không buộc AI sinh đúng tuyệt đối từng bài (giữ ±10% tolerance).
- Không đổi `total_pieces` schema trong `campaign_content_plans`.
- Không đổi UI ngoài Step 4 Xác nhận.
