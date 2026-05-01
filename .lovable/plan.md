## Vấn đề

Edge function `topic-ai` action `suggest` timeout 90s ở client. Logs cho thấy:

- 1 request gen mất **117.681s** (vượt timeout client 90s) → `WARNING [PERF][SLOW] topic-ai durationMs:117681`
- Model dùng `qwen-flash` (DashScope) — quá chậm cho payload lớn (brand context + 3 personas + 3 products + learning context).
- **Perplexity API key đang hết quota / sai key** (`401 Quota/auth exhausted`) → mỗi cold-start vẫn gọi 2 calls song song trước khi bị disable trong-isolate, lãng phí 1-2s/lần.
- Mỗi click "Viral tuần này" gửi `forceRefresh=true` → bypass cache → mỗi lần đều phải đợi LLM 100s+.
- Sau đó còn `repair pass` (call AI lần 2) khi tiêu đề ngắn — cộng thêm 10-20s nữa.

Tổng: cold-start + 2 perplexity 401 + qwen-flash gen 80-100s + repair → vượt 90s.

## Mục tiêu

Đưa thời gian phản hồi suggest về < 30s, ổn định, không phụ thuộc Perplexity (đang chết).

## Thay đổi

### 1. `supabase/functions/topic-ai/index.ts` — `handleSuggest`

- **Tắt Perplexity mặc định** khi không có key hợp lệ: trước khi gọi `searchIndustryData` / `searchAudienceQuestions`, kiểm tra `webSearchKillSwitch` (đã có sẵn trong `topic-utils.ts`) — nếu đã từng 401 trong isolate thì bỏ qua hoàn toàn, không enqueue task.
- **Truyền `cacheHitTimestamp` thực** vào `shouldSkipWebSearch` (hiện đang truyền `undefined`) để skip web search khi cache vừa miss nhưng còn data gần đây.
- **Hard timeout per Perplexity call** ở mức 8s (AbortController) — nếu chậm thì bỏ, generate vẫn chạy.
- **Hard timeout cho main AI call** 60s — nếu vượt thì throw để client thấy lỗi rõ thay vì timeout cứng 90s.

### 2. `supabase/functions/_shared/topic-utils.ts`

- Thêm export `isWebSearchKilled()` để `handleSuggest` đọc được trạng thái kill-switch và bỏ qua việc enqueue task ngay từ đầu (thay vì để task tự fail rồi mới tắt).
- Khi `PERPLEXITY_API_KEY` hoặc `OPENROUTER_API_KEY` không được cấu hình → set kill-switch luôn ở module load.

### 3. `supabase/functions/topic-ai/index.ts` — fallback model

- Đổi default từ `google/gemini-2.5-flash` → giữ nguyên, NHƯNG: nếu org override `qwen-flash` mà action là `suggest`, override-of-override về `google/gemini-2.5-flash-lite` (nhanh hơn 3-4x cho prompt cỡ này, vẫn đủ chất lượng cho 6 chủ đề ngắn).
- Hoặc đơn giản hơn: thêm tham số `maxTokens: 1500` (hiện tại có thể đang để default cao) để LLM dừng sớm.

### 4. `src/hooks/ai/useTopicAI.ts` — frontend resilience

- Khi user bấm refresh category (`Viral tuần này`), KHÔNG gửi `forceRefresh=true` mặc định — chỉ force khi user bấm nút "Refresh" rõ ràng. Click chuyển category nên dùng cache nếu có.
- Hiện thị thông báo "AI đang xử lý, có thể mất 30-60s" thay vì error toast khi thời gian > 15s, và hiển thị retry sau timeout.

### 5. (Tùy chọn) Hỏi user re-cấu hình Perplexity

Sau khi triển khai fix, hỏi user có muốn cập nhật `PERPLEXITY_API_KEY` mới hoặc tắt hẳn web search trong cấu hình không (vì hiện key đã 401).

## Files sẽ sửa

- `supabase/functions/topic-ai/index.ts`
- `supabase/functions/_shared/topic-utils.ts`
- `src/hooks/ai/useTopicAI.ts`

## Kết quả mong đợi

- Suggest response time: **< 30s** (cache miss), **< 1s** (cache hit).
- Không còn timeout 90s.
- Click chuyển category dùng cache → tức thì.
- Perplexity 401 không còn block luồng chính.
