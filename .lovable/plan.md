## Mục tiêu

Khắc phục việc gợi ý kênh & tần suất **luôn giống nhau** giữa các campaign. Thay edge function rule-based hiện tại bằng **LLM** đọc đủ context (title, description, objectives, duration, post count, audience, brand industry/voice, available connections) → trả channels + frequency phù hợp với từng campaign cụ thể.

## Vấn đề hiện tại (root cause)

`supabase/functions/suggest-channels/index.ts` là **rule-based 100%**:
- `OBJECTIVE_SCORES` + `DEFAULT_FREQ` là bảng tra cứu cứng
- Industry classifier = regex thô (5 nhóm)
- Bỏ qua: `campaign_duration_days`, `target_post_count`, brand voice, lịch sử campaign, mùa vụ
- Không có randomness/diversity → cùng input → cùng output

## Kiến trúc mới

```text
GoalWizard (Step 2/3)
   ↓ payload: {title, description, objectives, duration, post_count,
                brand{industry, voice, audience}, available_connections}
suggest-channels (AI-driven)
   ↓ Lovable AI Gateway · google/gemini-2.5-flash · Output.object schema
   ↓ Prompt có rule-based scoring làm "hint" + context campaign
   ↓ LLM chọn 3–6 kênh + frequency phù hợp + reasoning ngắn
Response: { channels: [{id, frequency, reason}], reasoning }
```

Rule-based cũ giữ làm **fallback** khi LLM timeout/429/402.

## Thay đổi chi tiết

### 1. `supabase/functions/suggest-channels/index.ts` (rewrite)

- Giữ `VALID_CHANNEL_IDS`, `VALID_FREQ`, `OBJECTIVE_SCORES` (làm hint vector trong prompt).
- Thêm: gọi `callAI` từ `_shared/ai-provider.ts` với model mặc định `google/gemini-2.5-flash`, đăng ký `ai_function_configs` (category `agent`) cho admin override.
- Structured output schema (Zod/JSON):
  ```ts
  {
    channels: Array<{
      id: ChannelId,
      frequency: "daily"|"3/week"|"2/week"|"weekly",
      reason: string  // 1 câu VN, lý do cụ thể cho campaign này
    }>,  // 3-6 items
    reasoning: string  // 1-2 câu tổng quan
  }
  ```
- Prompt structure:
  - **Context block**: title, description, objectives (primary đầu), duration, target_post_count, brand industry/voice/audience, available_connections, current month/season.
  - **Scoring hint**: dump `OBJECTIVE_SCORES[objective]` top 8 channels để LLM tham khảo (không bắt buộc theo).
  - **Rules**: (a) chỉ pick từ `available_connections` nếu có; (b) frequency phải khớp với `target_post_count / duration_weeks`; (c) đa dạng — không repeat preset; (d) reason phải reference context cụ thể.
- Validate output bằng Zod; nếu fail/timeout → fallback `scoreChannels()` cũ + log warning.
- Trả thêm `ai_powered: boolean` để UI biết hiển thị badge.

### 2. `src/hooks/agents/useSuggestChannels.ts`

- `SuggestChannelsInput` thêm: `campaign_duration_days?: number`, `target_post_count?: number`, `audience?: string`, `available_connections?: string[]`.
- `SuggestChannelsResult` thêm: `ai_powered?: boolean`.

### 3. `src/components/agents/GoalWizard.tsx`

- Cả 2 call site (`autoPilot` line ~776 và toggle "Để AI chọn kênh" line ~1937) truyền thêm:
  - `campaign_duration_days: durationDays`
  - `target_post_count: estimatedPosts`
  - `audience: audienceText` (nếu có field)
  - `available_connections`: query từ `social_connections` của brand (cached)
- Badge `✨ AI` cạnh reasoning khi `ai_powered === true`.
- Loading text: "🧠 AI đang phân tích kênh phù hợp cho campaign này…"

### 4. Available connections helper (mới)

`src/hooks/useAvailableSocialChannels.ts` (nếu chưa có): query `social_connections` theo `brand_template_id`, trả `string[]` channel ids đã kết nối → truyền vào suggest-channels.

## Files sẽ chỉnh

```text
supabase/functions/suggest-channels/index.ts   (rewrite — AI-driven + fallback)
src/hooks/agents/useSuggestChannels.ts         (thêm input/output fields)
src/components/agents/GoalWizard.tsx           (truyền context đầy đủ + badge)
[NEW] src/hooks/useAvailableSocialChannels.ts  (nếu chưa có hook tương đương)
```

## Edge cases

- **LLM timeout (>15s)** → fallback rule-based + log warning.
- **402 credit exhausted / 429 rate limit** → fallback rule-based, không throw lên UI.
- **available_connections rỗng** → AI vẫn chọn theo objective+industry như trước.
- **Output không hợp lệ** (channel id không thuộc whitelist, freq sai) → strip + fill bằng rule-based.
- **Cost control**: cache 5 phút theo hash `{objectives+industry+duration+post_count+available}` để tránh re-call khi user toggle switch.

## Không làm

- Không sửa `_shared/` (chỉ import `callAI`, `ai-config`).
- Không đổi schema DB.
- Không đụng `suggest-strategy` / `generate-campaign-strategy` (scope giới hạn ở channel & frequency).
- Không bỏ rule-based — vẫn dùng làm hint + fallback.
