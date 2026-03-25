

# Cập nhật Agent Directory — Hiển thị sub-steps thực tế theo Route

## Vấn đề hiện tại

Trang Agent Directory hiển thị danh sách `tasks` tĩnh, viết tay, không phản ánh đúng logic backend thực tế. Ví dụ: Creator Agent liệt kê 5 tasks chung chung, trong khi backend thực sự có 3 route riêng biệt (Multichannel, Video Script, Carousel) với các bước hoàn toàn khác nhau.

## Thiết kế mới

Thay thế mảng `tasks: string[]` bằng cấu trúc `routes` mô tả chính xác các sub-steps thực tế từ backend code.

### Dữ liệu thực tế từ backend

**Strategy Agent** (1 route):
1. Phân tích goal config + clarification context
2. Gọi `generate-campaign-strategy` → tạo content plan (N bài)
3. Mapping content role (Seed/Sprout/Harvest) + schedule

**Creator Agent** (3 routes):
- **Route A — Multichannel**: Core Content → Channel Expansion (N kênh) → Image Gen song song
- **Route B — Video Script**: Script Gen → Analyze & Score → Improve (nếu score < 70)
- **Route C — Carousel**: Slide Text + Prompts → Image Gen tuần tự (5-8 slides)

**Quality Agent** (3 bước song song):
1. GEO Scoring (`geo-score-content`)
2. Compliance Check (LLM — `gemini-2.5-flash`)
3. Persona-Fit Scoring (LLM — `gemini-2.5-flash-lite`)
→ Merge: GEO 40% + Compliance 35% + Persona 25%

**Approval Agent** (3 modes):
- Human-in-loop: Tạo approval record → chờ human
- Human-on-loop: Auto-approve + ghi log
- Full-auto: Skip → publish
- Smart Auto-Approve: Tự duyệt nếu quality ≥ threshold

**Publisher Agent** (3 bước):
1. Resolve content + UTM tagging
2. Publish tuần tự (stagger 2s) qua `channel-publisher`
3. Update `content_schedules` status

**Analyze** (stage cuối, không phải agent riêng):
1. Mark pipeline completed
2. Update campaign plan progress
3. Send completion notification

## Thay đổi cụ thể

### 1. Cập nhật `AgentInfo` interface
**File:** `src/components/agents/AgentDetailCard.tsx`

- Thêm field `routes` thay cho `tasks`:
```typescript
interface AgentRoute {
  id: string;
  label: string;        // "Multichannel", "Video Script"...
  condition?: string;    // "content_type = multichannel"
  steps: { label: string; detail?: string }[];
}

interface AgentInfo {
  // ...existing fields
  tasks?: string[];      // deprecated, giữ lại cho backward compat
  routes?: AgentRoute[];
}
```

### 2. Cập nhật `AgentDetailCard` UI
**File:** `src/components/agents/AgentDetailCard.tsx`

- Nếu có `routes` → render route tabs/sections với numbered steps
- Mỗi route hiển thị dạng: Route label → Step 1 → Step 2 → Step 3
- Routes có `condition` hiển thị badge nhỏ (e.g. "khi content_type = carousel")
- Fallback về `tasks` nếu không có `routes`

### 3. Cập nhật dữ liệu AGENTS
**File:** `src/pages/AgentDirectoryPage.tsx`

Thay thế mảng `tasks` bằng `routes` cho mỗi agent với dữ liệu chính xác từ backend:

- **Strategy**: 1 route, 3 steps
- **Creator**: 3 routes (A/B/C), mỗi route 3 steps
- **Quality**: 1 route, 3 steps song song + merge
- **Approval**: 3 routes theo autonomy level
- **Publisher**: 1 route, 3 steps

### 4. Cập nhật cost summary
Bỏ "6 stages" → "5 agents, 6 stages" (giữ nguyên vì analyze vẫn là stage)

## Phạm vi: 2 files
- `src/components/agents/AgentDetailCard.tsx` — interface + UI rendering
- `src/pages/AgentDirectoryPage.tsx` — data definitions

