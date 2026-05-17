## Tích hợp topic-ai vào tạo Campaign

### Mục tiêu

Khi user tạo AI Campaign, mỗi piece phải có chủ đề chất lượng cao từ pipeline **topic-ai** (scoring, trending, cluster, Topic Bank) — không còn để strategy AI tự bịa title.

### Kiến trúc

```text
GoalWizard Step 4 "Sinh lịch"
      ↓
[NEW] Pre-fetch topic pool từ topic-ai (action: suggest)
      ↓ pool {title, hook, key_message, scores, source}
generate-campaign-strategy (preview)
      ↓ AI nhận topic_pool → chọn N topic + gán channel/role/date/angle
plan rendered ở Step 4
      ↓ user confirm
[NEW] Auto-save các topic đã dùng vào Topic Bank (status: planned)
```

Topic-ai là **nguồn topic duy nhất**; strategy AI chỉ làm **orchestrator** (chia channel/role/lịch), không sinh title tự do nữa.

### Thay đổi cụ thể

**1. Hook mới `useCampaignTopicPool` (frontend)**
- Gọi `topic-ai` (action `suggest`) qua `useTopicAI` hiện có, với:
  - `brandTemplateId`, `contentGoal` map từ primary objective (awareness→awareness, conversion→sales, …)
  - `categoryHint` = campaign title
  - `count` = `estimatedPosts * 1.5` (dư để AI chọn lọc), cap 60
- Trả `pool: { title, hook, key_message, scores, source }[]`

**2. `generate-campaign-strategy` — nhận `topic_pool`**
- Body thêm: `topic_pool?: Array<{title, hook, key_message, scores?}>`
- Khi có pool:
  - Inject vào system prompt block **TOPIC POOL (MUST pick from here)**:
    ```
    Bạn PHẢI chọn title từ pool này (không được bịa). Mỗi piece = 1 topic từ pool.
    Pool (sorted by quality score):
    [01] {title} — hook: {hook} — score: {scores.overall}
    ...
    ```
  - Đổi rule (1): "Pick EXACTLY N topics FROM POOL, mỗi topic dùng đúng 1 lần"
  - Thêm field `pool_index: number` vào tool schema để track topic gốc
- Khi pool rỗng/thiếu → fallback logic cũ (AI tự sinh) + warning.

**3. `GoalWizard.tsx` — `triggerSchedulePreview`**
- Trước khi gọi `previewSchedule.run`, gọi `useCampaignTopicPool.fetch()` → đợi pool về.
- UI: hiện trạng thái 2-phase loading: "🧠 Đang chọn chủ đề từ Topic AI…" → "📅 Đang sắp lịch…"
- Truyền `topic_pool` vào payload preview.

**4. Auto-save Topic Bank khi confirm**
- Trong `handleConfirm` (nơi user bấm "Tạo campaign"):
- Sau khi `generate-campaign-strategy` (non-preview) thành công, batch insert vào bảng `topics` với:
  - `status='planned'`, `source='campaign'`, `campaign_id`, `brand_template_id`, `organization_id`
  - title/hook/key_message lấy từ pool đã match
- Dùng RPC hoặc direct insert (tái dùng pattern từ `useTopicAI.suggestions.saveSuggestion`)

**5. `PieceTopicSuggestPopover` — nâng cấp dùng topic-ai**
- Đổi `useSuggestPieceTopics` → wrap `useTopicAI({...}).suggestions.refresh()` để gợi ý thay-thế cũng dùng topic-ai (scoring + trending + Topic Bank cache).
- Giữ nguyên UX: popover, click chọn → cập nhật piece.

### Files sẽ chỉnh

```text
[NEW] src/hooks/agents/useCampaignTopicPool.ts
        - Wrap useTopicAI, map primary_objective → contentGoal,
          trả Promise<TopicPoolItem[]>

src/components/agents/GoalWizard.tsx
        - triggerSchedulePreview: pre-fetch pool → pass topic_pool
        - 2-phase loading UI
        - handleConfirm: auto-save pool topics vào Topic Bank

src/hooks/agents/usePreviewSchedule.ts
        - PreviewRequest thêm topic_pool?

supabase/functions/generate-campaign-strategy/index.ts
        - Đọc topic_pool từ body
        - buildStrategyPrompt: thêm TOPIC POOL block + đổi rule (1)
        - Tool schema: thêm pool_index field
        - Apply ở cả primary + fallback call

src/components/agents/PieceTopicSuggestPopover.tsx
        - Đổi sang useTopicAI suggestions (giữ UI)

src/hooks/agents/useSuggestPieceTopics.ts
        - Mark @deprecated, redirect sang useTopicAI internally
          (giữ backward-compat cho call sites khác nếu có)
```

### Edge cases

- **Pool rỗng** (brand chưa setup, topic-ai timeout): fallback strategy AI tự sinh + banner amber "Không lấy được Topic AI, dùng AI tự do".
- **Pool < số piece cần**: AI được phép bịa thêm phần thiếu, log warning.
- **User edit title thủ công sau khi sinh**: không auto-save vào Topic Bank với title cũ — chỉ save title cuối cùng lúc confirm.
- **Multi-objective**: contentGoal = mapping từ `primary_objective`; secondary objectives chỉ ảnh hưởng rule 70/30 cũ (không đổi pool).

### Không làm

- Không đổi schema `topics` table.
- Không sửa `_shared/` (tránh ảnh hưởng 157 functions).
- Không đụng pipeline agent execution sau khi confirm.
- Không bắt buộc Topic Bank — vẫn save best-effort, fail silent.
