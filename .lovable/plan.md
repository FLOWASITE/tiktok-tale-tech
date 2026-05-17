# Auto-Suggest Objectives Mode

## Mục tiêu
Thêm toggle "✨ Để AI chọn giúp" vào step Objective trong `GoalWizard`. Khi bật, AI phân tích brief (industry, brand, mô tả campaign, audience, channels đã chọn) → đề xuất 1 primary + 1-2 secondary objectives + KPI gợi ý. User vẫn override được trước khi Next.

## Flow

```text
[Step Objective mở ra]
   │
   ├── Toggle "✨ Để AI chọn giúp"  (OFF mặc định)
   │
   ON ──► Loading skeleton (3 cards shimmer + KPI rows)
         │
         ├── Call edge: suggest-objectives
         │    Input: { brief, brand, industry, audience, channels, locale }
         │    Output: { primary, secondary[], kpis{}, reasoning }
         │
         ├── Pre-fill state:
         │    objectives = [primary, ...secondary]
         │    kpis = output.kpis  (override các field rỗng, giữ field user đã nhập)
         │
         └── Render cards với badge "✨ AI gợi ý" + tooltip reasoning
              User có thể: bỏ chọn, đổi primary, sửa KPI bình thường
```

## Thay đổi code

### 1. Edge function mới: `supabase/functions/suggest-objectives/index.ts`
- `verify_jwt = false` + service client + JWT validate trong code (theo pattern Flowa)
- Input schema (zod): `briefContext` (description, audience, channels, locale), `brandSnapshot` (name, industry_template_id, voice tags), `availableObjectives` (id + label list từ frontend để AI chỉ chọn trong tập hợp hợp lệ)
- Load industry rules nếu `industry_template_id` có → đưa vào system prompt (tránh đề xuất conflict)
- Gọi `callAI()` với `google/gemini-3-flash-preview`, structured output (zod schema):
  ```
  { primary: ObjectiveId, secondary: ObjectiveId[] (0-2), kpis: { reach?, engagement?, conversions?, … }, reasoning: string (vi, ≤200 ký tự) }
  ```
- Validate: `secondary` không chứa `primary`, tổng ≤3, không vi phạm `GOAL_ANGLE_CONFLICTS`/`GOAL_ROLE_CONFLICTS`. Nếu AI trả conflict → strip secondary vi phạm rồi return.
- Log `ai_metrics` (traceId, model, cost)
- Khai báo trong `supabase/config.toml`

### 2. Hook mới: `src/hooks/agents/useSuggestObjectives.ts`
- Wrap `supabase.functions.invoke('suggest-objectives', ...)` qua TanStack mutation
- States: `idle | loading | success | error`
- Trả `{ primary, secondary, kpis, reasoning }`

### 3. `src/components/agents/GoalWizard.tsx`
- Thêm state `autoMode: boolean` (default `false`), `aiSuggestion: { reasoning, isAI: true } | null`
- Phía trên list objective cards: 1 row chứa `<Switch>` "✨ Để AI chọn mục tiêu giúp tôi" + caption nhỏ "AI sẽ phân tích brief để đề xuất tối ưu"
- Khi `autoMode` bật lần đầu (hoặc khi brief thay đổi đáng kể):
  - Call `useSuggestObjectives.mutate(...)` với context hiện có
  - Loading: skeleton 3 cards + KPI section blur
  - Success: set `objectives = [primary, ...secondary]`, merge KPI (chỉ fill field đang rỗng để tôn trọng input user), set `aiSuggestion`
  - Error (429/402/timeout): toast lỗi, auto tắt toggle, fallback về manual
- Mỗi objective được AI chọn hiển thị badge `✨ AI` (neutral gray theo Soft Luxury) cạnh tên; tooltip hover hiện `reasoning`
- KPI auto-fill: input có placeholder italic `✨ AI gợi ý: 5000` thay vì set value cứng — tránh nhầm với user input. (Hoặc set value + small `Undo` link bên cạnh.) **→ chọn approach set value + nút "↺ Khôi phục trống" cho từng field**
- User mọi thao tác (toggle objective, đổi primary, sửa KPI) → `autoMode` vẫn ON nhưng badge ✨ biến mất khỏi field đã edit (đánh dấu `userOverridden`)
- Edit campaign cũ: nếu campaign đã có objectives → `autoMode = false` mặc định

### 4. Memory update
Append vào `mem://features/agent/multi-objective-campaign-vn`: section "Auto-Suggest Mode" mô tả toggle, edge function, KPI merge logic.

## Out of scope
- Không đổi `generate-campaign-strategy` (vẫn nhận `objectives` + `primary` + `weights` như cũ)
- Không thêm AI suggest cho các step khác (audience, channel) — sẽ làm sau nếu được duyệt
- Không lưu `ai_suggestion_reasoning` vào DB (chỉ giữ ở client state để hiển thị; có thể thêm sau)
- Không bật Auto mode mặc định cho user mới — opt-in để giữ minh bạch

## Verification
1. Toggle ON → thấy loading 1-3s → 3 cards có badge ✨, KPI fill số
2. Click bỏ 1 secondary → còn primary + 1 secondary, badge ✨ giữ nguyên card còn lại
3. Sửa KPI reach → badge ✨ biến mất khỏi field đó, các field khác giữ ✨
4. Toggle OFF → trở về empty state ban đầu (clear objectives + KPI AI đã set; giữ field user đã sửa tay)
5. Brief rỗng (chưa nhập gì) → toggle disabled + tooltip "Hãy nhập mô tả campaign trước"
6. Edge function trả conflict (Awareness + Revenue) → tự strip Revenue, thấy reasoning note
7. 402/429 → toast "AI hết credit / quá tải", toggle auto-OFF
