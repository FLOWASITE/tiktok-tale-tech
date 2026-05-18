# Plan: Bảng Kênh × Tần suất × Loại nội dung

## Mục tiêu
Card "Kênh & Tần suất" ở Step "Lịch nội dung" (GoalWizard, ~line 2328) hiện chỉ có 3 cột: Kênh | Tần suất | ~bài. Mở rộng thành bảng có thêm các cột **Multichannel post**, **Carousel**, **Video** để user thấy (và chỉnh) mix content type của từng kênh.

## UI mới (1 row / kênh)

```text
┌─ KÊNH & TẦN SUẤT ──────────────────────────────────────────────────────────┐
│ Kênh        Tần suất    Tổng     📝 Bài     🎞 Carousel    🎬 Video       │
│ Facebook    3/tuần      ~6 bài    4           2              0            │
│ LinkedIn    2/tuần      ~4 bài    3           1              0            │
│ Zalo OA     Hàng tuần   ~2 bài    2           0              0            │
│ Website     Hàng tuần   ~2 bài    2           —              —            │
│ Blogger     Hàng tuần   ~2 bài    2           —              —            │
└────────────────────────────────────────────────────────────────────────────┘
            mặc định AI tự phân bổ • bấm số để chỉnh
```

- 3 cột content type là **inline number input** (or +/- stepper), không phải dialog.
- Channel không hỗ trợ thì hiện `—` disabled (Website/Blogger/Email = chỉ post; Pinterest = post + carousel; v.v.).
- Tổng 3 cột luôn = `~bài`; nếu user chỉnh lệch → auto-rebalance cột còn lại + badge cảnh báo nhỏ.

## Quy tắc hỗ trợ content type theo kênh

| Channel | post (multichannel) | carousel | video_script |
|---|---|---|---|
| facebook, instagram, linkedin, threads, twitter, bluesky, telegram | ✅ | ✅ | ✅ |
| pinterest | ✅ | ✅ | ❌ |
| zalo_oa, google_maps | ✅ | ❌ | ❌ |
| website, blogger, wordpress, shopify, wix, email | ✅ long-form | ❌ | ❌ |

(Đặt trong `src/lib/channelContentTypeSupport.ts` mới.)

## Thay đổi files

### 1. `src/lib/channelContentTypeSupport.ts` (NEW)
- Export `CHANNEL_CONTENT_SUPPORT: Record<Channel, { post: boolean; carousel: boolean; video: boolean }>`
- Export `defaultContentMix(channel, totalPosts)` → trả về `{ post, carousel, video }` (AI heuristic: social visual = 60% post / 30% carousel / 10% video; long-form = 100% post; v.v.)

### 2. `src/types/agent.ts`
- Thêm field optional vào `AgentGoal`:
  ```ts
  content_mix: Record<string, { post: number; carousel: number; video: number }> | null;
  ```

### 3. Migration `supabase/migrations/<ts>_agent_goals_content_mix.sql`
```sql
ALTER TABLE public.agent_goals
  ADD COLUMN IF NOT EXISTS content_mix jsonb DEFAULT '{}'::jsonb;
COMMENT ON COLUMN public.agent_goals.content_mix IS
  'Per-channel content type breakdown: { facebook: { post: 4, carousel: 2, video: 0 } }';
```

### 4. `src/components/agents/GoalWizard.tsx`
- State mới: `const [contentMix, setContentMix] = useState<Record<string, {post:number; carousel:number; video:number}>>({})`
- Khi `selectedChannels`/`frequency`/`effectiveDuration` đổi → auto-fill `contentMix[ch] = defaultContentMix(ch, getChannelPosts(ch))` cho kênh chưa có entry hoặc khi tổng cũ ≠ tổng mới (reset).
- Thay block `Kênh & Tần suất` (line 2328-2350) bằng **table layout** 6 cột với inline `<Input type="number" />` (size sm, h-6 w-12, tabular-nums) cho 3 cột content type. Disabled `—` nếu kênh không support.
- Auto-rebalance handler: khi user sửa 1 cột, phân phối lại 2 cột còn lại tỉ lệ thuận để giữ `post+carousel+video = totalPosts`.
- Truyền `content_mix: contentMix` vào `handleSubmit` (line ~990) + reset `initialData.content_mix` ở line 556.

### 5. `src/hooks/useAgentGoals.ts`
- Khi insert/update goal, persist `content_mix`.

### 6. Sync với schedule generator (optional, V1.1)
- `generate-campaign-strategy` edge function: nếu `content_mix` có giá trị, force phân bổ `content_type` của từng `CampaignContentPiece` theo tỉ lệ này thay vì heuristic mặc định. → ngoài scope V1, ghi TODO.

## Backward compat
- `content_mix = {}` hoặc `null` → UI tự fill default, lưu lần đầu không bắt buộc.
- Goal cũ hiển thị bình thường (default mix tính client-side).

## Không thay đổi
- Picker chọn kênh, frequency picker, schedule studio.
- Schema `campaign_content_plans`.
- Edge functions (V1 chỉ frontend + persist field).

## Validation
1. Mở GoalWizard → Step "Lịch nội dung". Card "Kênh & Tần suất" thành bảng 6 cột.
2. Facebook 3/tuần ~6 bài → default `4 / 2 / 0`. Đổi Video từ 0 → 2 → Post auto giảm xuống 3.
3. Website hiện `—` ở cột Carousel + Video, disabled input.
4. Save goal → reload → mix giữ nguyên.
5. Goal cũ không có `content_mix` vẫn hiển thị, không crash.

## Câu hỏi cần xác nhận trước khi build
1. **Editable hay read-only?** Plan trên = editable inline. Nếu chỉ muốn hiển thị (AI tự quyết, user không sửa) → bỏ Input, bỏ migration `content_mix`, chỉ thêm cột estimate client-side.
2. **Đặt cột Video** cho long-form channel (Website/Blogger)? Hiện đang `—`. Nếu muốn "Video embed trong bài" → cho phép.
3. **V1.1 sync xuống schedule generator** có làm ngay luôn không?
