# Vì sao kênh & tần suất giống nhau giữa các lần tạo Campaign

## Chẩn đoán (root cause)

Toàn bộ logic gợi ý kênh nằm ở `supabase/functions/suggest-channels/index.ts`. Có **5 điểm cứng** khiến output gần như giống hệt nhau giữa các lần chạy với cùng brand + objective:

### 1. Bảng điểm `OBJECTIVE_SCORES` cố định (line 31-40)
Mỗi objective map sang 1 bảng điểm tĩnh. Với cùng `objectives[0]` (ví dụ `awareness`) thì top channels luôn là `facebook=90, instagram=85, threads=70…` — không thay đổi giữa các lần.

### 2. `DEFAULT_FREQ` 1-1 per channel (line 42-48)
- `facebook → 3/week`, `instagram → 3/week`, `twitter → daily`, `website → weekly`...
- **Fallback** (`scoreChannels`) trả thẳng `DEFAULT_FREQ[id]` ⇒ 100% trùng nhau khi AI fail/timeout.
- Telegram có timeout 12s ⇒ rất hay rơi vào fallback.

### 3. "RULE-BASED HINTS" block trong prompt (line 125-135, 268-269)
Prompt **bơm top-6 channel scores trực tiếp vào LLM**. LLM (temp 0.6) bị anchor cực mạnh, hầu như luôn pick từ top hints. Trong khi mục tiêu thiết kế là "AI free pick".

### 4. Không có random/diversity signal
Prompt không truyền: `run_id`, `random_seed`, `previously_picked_channels`, `last_campaign_channels`. Cùng input ⇒ cùng output. Một số provider còn cache theo prompt hash ⇒ identical response.

### 5. Frequency band quá hẹp (line 274-278)
Chỉ 4 giá trị `daily | 3/week | 2/week | weekly` + rule "long-form max weekly, messaging max 2/week". Sau khi LLM tuân thủ rule, không gian còn 1-2 lựa chọn / channel ⇒ trùng là tất yếu.

### Bonus
- `available_connections` thường chỉ 4-6 kênh active ⇒ candidate pool nhỏ, kết quả gần bão hòa.
- `getSeasonHint()` chỉ đổi theo quý.
- Validation `validateLLMResult` reject mọi frequency lạ ⇒ ép về 4 band cứng.

---

## Plan giảm trùng (3 lớp)

### P1 — Khử anchor cố định (impact lớn, ít rủi ro)
**File:** `supabase/functions/suggest-channels/index.ts`

1. **Bỏ hint block khỏi prompt LLM** (hoặc downgrade sang "context" thay vì "scores")
   - Thay `buildHintBlock` bằng mô tả định tính: "Facebook mạnh reach VN, LinkedIn mạnh B2B…" — không kèm số điểm.
   - Giữ `OBJECTIVE_SCORES` chỉ cho fallback path.

2. **Inject diversity context vào prompt**
   - Query 3 campaign gần nhất của brand: `SELECT channels, frequency FROM agent_goals WHERE brand_template_id=? ORDER BY created_at DESC LIMIT 3`.
   - Thêm section: "RECENT CAMPAIGNS đã dùng: [list] — ưu tiên đa dạng hoá, đề xuất ít nhất 1 kênh khác biệt."

3. **Tăng temperature 0.6 → 0.85** + thêm `seed` random vào prompt (timestamp + goal title hash) để force variation.

### P2 — Frequency thông minh hơn
1. **Mở rộng frequency band**: thêm `4/week`, `2/day` (cho social ngắn), `bi-weekly` (cho long-form ít cập nhật).
2. **Tính frequency theo `target_post_count` thực**, không dựa preset:
   - `freq_per_channel = round(channel_share × target_post_count / weeks)`
   - Map số → label band gần nhất.
3. **Fallback không dùng `DEFAULT_FREQ`** — derive từ `postsPerWeekTarget` × channel share weight.

### P3 — UI/UX surface variation
1. Trong GoalWizard hiển thị badge "AI-suggested" vs "Rule-based fallback" để user biết khi nào output là deterministic.
2. Nút **"Tạo lại gợi ý"** force `bypass_cache=true` + random seed mới.
3. Hiển thị `reasoning` để user thấy logic khác nhau giữa các lần (nếu reasoning trùng ⇒ rõ ràng do cache/fallback).

### P4 — Quan sát (optional)
- Log `ai_powered` + `model_used` + first-3-channel-ids vào `ai_metrics` để đo tỉ lệ fallback và mức độ trùng lặp thực tế. Nếu fallback >30% ⇒ AI provider không ổn định, cần fix timeout hoặc fallback model.

---

## Files dự kiến edit (khi triển khai)
- `supabase/functions/suggest-channels/index.ts` — core fix (P1, P2)
- `supabase/functions/telegram-webhook/index.ts` — pass `previous_channels` + tăng timeout 12s → 18s
- `src/components/agents/GoalWizard*.tsx` — UI "Tạo lại gợi ý" + badge nguồn
- (Optional) migration thêm cột `ai_metrics.channel_pick_signature`

## Out of scope
- Train custom model
- A/B test framework cho channel mix
- Real-time performance feedback loop (đợi có publish data)

---

## TL;DR cho user
Hiện có 2 thủ phạm chính:
1. **`DEFAULT_FREQ` cứng + fallback path** — mỗi khi AI chậm/lỗi (Telegram 12s timeout rất hay dính), bot trả về preset y hệt.
2. **Prompt LLM bị "mớm" sẵn bảng điểm objective** ⇒ AI bám theo top channels của objective, gần như deterministic.

Fix nhanh nhất: bỏ hint scores khỏi prompt + bơm "recent campaigns to avoid" + tăng temperature + tính frequency từ post_count thật thay vì lookup table.
