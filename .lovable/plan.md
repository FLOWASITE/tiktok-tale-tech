## Kết luận nguyên nhân
`topic-ai` hiện không tạo được topic dù đã set `qwen3-plus` vì có xung đột logic nội bộ:

1. `ai-config` resolve đúng model:
   - log: `[ai-config] topic-ai: resolved model=qwen3-plus source=individual`
2. Nhưng ngay trong `supabase/functions/topic-ai/index.ts`, hàm `sanitizeTopicAIModel()` đang dùng allowlist cứng và **không chứa Qwen3 / DashScope models**.
3. Kết quả: `qwen3-plus` bị xem là unsupported và bị đổi sang `google/gemini-2.5-flash`:
   - log: `[topic-ai] Unsupported model qwen3-plus, fallback -> google/gemini-2.5-flash`
4. Sau đó `ai-provider` route model Gemini sang **Lovable Gateway**:
   - log: `[ai-provider] Primary provider: lovable`
5. Lovable Gateway đang hết credits nên trả 402:
   - log: `[ai-provider] Lovable Gateway error: 402 Not enough credits`

Ngoài ra còn lỗi phụ:
- Perplexity web search đang 401 quota exceeded.
- UI `TopicIdeaHub` không truyền/hiển thị `errorCode`, nên người dùng chỉ thấy “không có kết quả” thay vì biết rõ là model bị fallback sai hoặc provider hết credits.

## Plan triển khai

### 1. Sửa `topic-ai` để chấp nhận Qwen3 đúng cách
File: `supabase/functions/topic-ai/index.ts`
- Bổ sung các model DashScope mới vào `TOPIC_AI_ALLOWED_MODELS`, tối thiểu:
  - `qwen3-max`
  - `qwen3-plus`
  - `qwen3-turbo`
  - `qwen3-flash`
  - `qwen3-long`
  - `qwen3-vl-max`
  - `qwen3-vl-plus`
  - `qwen3-coder-plus`
  - alias `qwen-plus-latest`, `qwen-max-latest` nếu cần
- Giữ alias remap cho model Gemini preview cũ.
- Đảm bảo khi admin chọn `qwen3-plus`, `buildTopicAIOverrides()` trả lại đúng `modelOverride='qwen3-plus'`, không ép fallback sang Gemini nữa.

### 2. Làm cho fallback an toàn hơn
File: `supabase/functions/topic-ai/index.ts`
- Điều chỉnh `sanitizeTopicAIModel()` để fallback hợp ngữ cảnh:
  - nếu model là DashScope hợp lệ thì giữ nguyên
  - chỉ fallback về Gemini khi model thật sự không hợp lệ
- Tránh tình trạng “admin chọn model A nhưng function silently đổi sang model B của provider khác”.

### 3. Giữ topic generation hoạt động dù Perplexity hết quota
File: `supabase/functions/topic-ai/index.ts`
- Khi industry search / Q&A mining trả 401 quota exceeded:
  - không coi toàn bộ request là failure
  - bỏ qua web search enrichment
  - vẫn generate topic từ brand context + persona + product + recent topics
- Gắn cờ nội bộ kiểu `webSearchSkipped` để prompt không phụ thuộc vào dữ liệu trend rỗng.

### 4. Hiển thị lỗi rõ ngay tại TopicIdeaHub
Files:
- `src/components/topic/TopicIdeaHub.tsx`
- các nơi gọi `TopicIdeaHub`:
  - `src/components/multichannel/MultiChannelFormStepper.tsx`
  - `src/components/script/ScriptFormStepper.tsx`
  - `src/components/CarouselForm.tsx`
  - và nơi khác nếu có
- `src/components/TopicSuggestionPanel.tsx` nếu cần

Cập nhật để:
- truyền `error` + `errorCode` từ `useTopicAI().suggestions`
- hiển thị `TopicCreditsAlert` hoặc banner lỗi tương ứng ngay trong hub
- tránh trạng thái im lặng “0 suggestions” khi thật ra provider/model đang lỗi

### 5. Đồng bộ logic model giữa admin config và edge function
Mục tiêu là tránh lặp logic ở 2 nơi:
- UI/admin đã cho chọn `qwen3-plus`
- edge function cũng phải hiểu model đó là hợp lệ

Nếu cần, tôi sẽ chuẩn hóa rule để `topic-ai` dùng cùng tập model DashScope đã khai báo ở lớp config thay vì tự giữ allowlist cứng bị lệch version.

## Technical details
```text
Admin AI config
  -> ai-config resolves qwen3-plus
  -> topic-ai sanitizeTopicAIModel()
     -> CURRENT: reject qwen3-plus, fallback to gemini
     -> FIXED: accept qwen3-plus
  -> ai-provider detects provider
     -> CURRENT after fallback: lovable
     -> FIXED: dashscope
  -> call DashScope directly
```

### Files sẽ sửa
- `supabase/functions/topic-ai/index.ts`
- `src/components/topic/TopicIdeaHub.tsx`
- `src/components/multichannel/MultiChannelFormStepper.tsx`
- `src/components/script/ScriptFormStepper.tsx`
- `src/components/CarouselForm.tsx`
- có thể thêm 1-2 file hook/UI liên quan nếu cần truyền `errorCode`

## Tiêu chí nghiệm thu
- Trong log `topic-ai` không còn dòng:
  - `Unsupported model qwen3-plus, fallback -> google/gemini-2.5-flash`
- Khi chọn `qwen3-plus` cho `topic-ai`, log thể hiện provider là DashScope, không phải Lovable.
- Dù Perplexity hết quota, topic-ai vẫn trả được danh sách chủ đề từ brand context.
- Nếu provider thật sự lỗi/hết credits, UI hiển thị cảnh báo rõ ràng ngay trong Topic Idea Hub, không im lặng trống kết quả.