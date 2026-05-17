# AI Auto-Pilot cho GoalWizard

## Hiện trạng
GoalWizard có 4 step: **Mục tiêu → Chiến lược → Kênh → Xác nhận**. Đã có AI suggest cho 2/4:
- ✅ `suggest-objectives` (Step 0) — autoMode toggle có sẵn
- ❌ Step 1 Chiến lược (budget %, key messages, CTA, pillar allocation, posts target) — toàn bộ user nhập tay
- ✅ `suggest-channels` (Step 2) — autoChannelMode có sẵn
- ✅ `suggest-piece-topics` (Step Topic) — đã có nhưng chỉ trigger sau khi tạo plan, không phải trong wizard

## Mục tiêu
Thêm **một nút "🪄 AI tự chạy toàn bộ"** ở đầu wizard + **AI auto-suggest cho Step Chiến lược** để user chỉ cần nhập tên + mô tả ngắn, AI tự fill 4 step rồi user review.

## Việc cần làm

### 1. Edge function mới: `suggest-strategy`
- Input: `brand_template_id`, `objectives[]`, `target_channels[]`, `campaign_duration_days`, `description`
- Output:
  ```ts
  {
    key_messages: string[],       // 3-5 thông điệp
    primary_cta: string,
    budget_allocation: { content, ads, kol },  // % cộng 100
    pillar_allocation: Record<string, number>, // tên pillar -> %
    total_posts_target: number,
    reasoning: string
  }
  ```
- Logic: dùng Lovable Gateway (`google/gemini-3-flash-preview`), prompt dựa trên brand voice + industry memory + objectives. Đăng ký vào `ai_function_configs` (category=`agent`).
- Pattern theo `suggest-channels` (vừa refactor sang heuristic không cần AI). Cân nhắc: phần `key_messages`/`primary_cta` cần AI, phần `budget_allocation`/`pillar_allocation`/`total_posts_target` có thể tính heuristic theo objective + duration (giống `suggest-channels`). → Hybrid: heuristic cho số, AI cho text.

### 2. Hook mới: `useSuggestStrategy.ts` (React Query mutation, pattern giống `useSuggestChannels`).

### 3. UI Step 1 (Chiến lược) — thêm Auto mode
- Toggle "🪄 AI tự chọn chiến lược" ở đầu Step 1 (giống pattern Step 0/2).
- Khi bật:
  - Gọi `suggestStrategy` với context từ Step 0+2.
  - Fill: `keyMessages`, `primaryCta`, `budgetAllocation`, `pillarAllocation`, `totalPostsTarget`.
  - Hiển thị reasoning badge + cho phép user edit thủ công (giữ origin AI marker giống Step 0).
- Loading skeleton + retry button khi error.

### 4. Master "AI tự chạy toàn bộ" button (đầu wizard, Step 0)
- 1 button lớn `<Sparkles/> Để AI lo hết` ở header dialog.
- Khi click:
  1. Bật `autoMode` (objectives) → chờ kết quả → tự next.
  2. Bật `autoChannelMode` (channels) → chờ → tự next.
  3. Bật auto strategy → chờ → tự next.
  4. Dừng ở Step "Xác nhận" cho user review trước khi save+generate.
- Progress overlay: "Đang chọn mục tiêu... Đang chọn kênh... Đang lên chiến lược..." với 3 bullet checkmark.
- User vẫn có thể bấm Back để chỉnh từng bước.

### 5. Topic auto-pick (đã có, chỉ link lại)
- `suggest-piece-topics` đã chạy tự động trong `agent-pipeline` sau khi plan được duyệt.
- Đảm bảo khi `approval_mode = full_auto`, topics được generate ngay không chờ user → check flow hiện tại trong `agent-pipeline` (chỉ verify, không sửa nếu đã đúng).

## File ảnh hưởng
- **Tạo mới**:
  - `supabase/functions/suggest-strategy/index.ts`
  - `src/hooks/agents/useSuggestStrategy.ts`
- **Sửa**:
  - `src/components/agents/GoalWizard.tsx` — thêm autoStrategyMode state, render auto toggle Step 1, thêm master "AI tự chạy" button + orchestration logic
  - `supabase/config.toml` — đăng ký `suggest-strategy` (verify_jwt=true, dùng auth user)
- **Migration**: insert row vào `ai_function_configs` cho function mới (category=`agent`).

## Không đụng vào
- `agent-pipeline`, `generate-campaign-strategy` (đã chạy tốt sau khi user duyệt plan).
- `suggest-piece-topics` (Topic) — đã wire sẵn.
- Industry/Brand cascade.

## Risk & Trade-offs
- Master button làm 3 API call tuần tự → ~6-10s tổng. Cần loading UX rõ ràng.
- AI strategy có thể đề xuất pillar không khớp brand → giữ edit thủ công + reasoning hiển thị để user verify.
