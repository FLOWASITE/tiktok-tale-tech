## Mục tiêu
Nghiên cứu bộ từ khóa SEO cho **flowa.one** (AI Marketing Agent cho VN/SEA, vertical aesthetic/beauty) và nạp thẳng vào `seo_keywords` + `keyword_clusters` của workspace **"Công ty CP Công nghệ Flowa"** (`bccfec38-...`).

Sau khi xong, bạn vào **Admin → SEO Hub → Keywords** là thấy đầy đủ, sẵn sàng dùng tab **Pages** để generate landing.

## Phương pháp nghiên cứu
Kết hợp 3 nguồn (không tốn API trả phí):
1. **Phân tích positioning flowa.one** (đã fetch homepage): AI Agent điều phối content pipeline, 12 channels, replace content team, VN/TH/EN.
2. **Gemini 2.5 Pro** (qua Lovable AI Gateway) → expand seed keywords thành long-tail VN, ước lượng `volume`/`difficulty`/`intent`/`funnel_stage`.
3. **Heuristic** cho intent (regex trong `keyword-bulk-import` đã có sẵn).

## Bộ seed keyword (10 cụm chính)
Định hướng 3 lớp: brand+category, problem-solving (TOFU), solution comparison (MOFU), conversion (BOFU).

| Cluster | Seed examples |
|---|---|
| AI Marketing Agent | "AI marketing agent", "AI agent marketing tự động", "agentic marketing platform" |
| Content Automation | "tự động hóa content marketing", "phần mềm tạo content AI", "tool viết content tự động" |
| Multi-channel Publishing | "đăng bài đa kênh", "publish content nhiều nền tảng", "tool quản lý social media" |
| AI Content Generation VN | "AI viết bài tiếng Việt", "AI tạo caption", "AI viết content facebook" |
| Carousel/Visual AI | "AI tạo carousel instagram", "tool thiết kế post tự động" |
| Video Script AI | "AI viết kịch bản video", "tạo script TikTok bằng AI", "AI làm video marketing" |
| Beauty/Aesthetic Vertical | "marketing thẩm mỹ viện", "content cho spa", "quảng cáo phòng khám da liễu" |
| SEO/GEO | "GEO optimization là gì", "SEO cho AI search", "tối ưu nội dung cho ChatGPT" |
| Brand Voice / Compliance | "AI clone giọng văn thương hiệu", "kiểm duyệt content quảng cáo y tế" |
| Competitor/Comparison | "Jasper AI thay thế", "Buffer alternative Vietnam", "so sánh tool marketing AI" |

Mục tiêu: **~150 keyword** sau khi expand (15 long-tail × 10 cluster).

## Triển khai (sequential, ~3-5 phút)

### Bước 1 — Tạo 10 cluster
Migration nhẹ hoặc trực tiếp INSERT vào `keyword_clusters` cho org `bccfec38-...`, mỗi cluster có `name` + `description` + `seed_keywords`.

### Bước 2 — Sinh keyword bằng AI script
Dùng skill `ai-gateway` (script `lovable_ai.py`, model `google/gemini-2.5-pro`) chạy trong sandbox:
- Input: 10 seed cluster + brief về flowa.one + yêu cầu output JSON schema.
- Output schema mỗi keyword: `{keyword, search_volume_est, difficulty_est, intent, funnel_stage, cluster_name, rationale}`.
- Mỗi cluster sinh ~15 long-tail tiếng Việt + 2-3 tiếng Anh (cho thị trường SEA).

### Bước 3 — Insert vào `seo_keywords`
- Map `cluster_name` → `cluster_id` vừa tạo.
- `priority_score` để DB trigger `calc_keyword_priority` tự tính (đã có sẵn từ migration trước).
- `status = 'new'`, `source = 'ai_research_initial_seed'`, `locale = 'vi'` (hoặc 'en' cho keyword tiếng Anh).
- Dùng `psql COPY FROM STDIN` (insert tool có quyền INSERT) — bulk ~150 row trong 1 query.

### Bước 4 — Verify
SELECT count theo cluster + top 10 priority để show user kết quả.

## Tech notes
- Gọi AI qua `/tmp/lovable_ai.py --schema /tmp/kw_schema.json --model google/gemini-2.5-pro` để có structured output ổn định.
- Cluster trigger `update_cluster_stats` đã có → tự động cập nhật `keyword_count` + `avg_priority` sau khi insert.
- KHÔNG cần edit code, KHÔNG cần migration mới (schema đã sẵn từ task trước).
- KHÔNG ảnh hưởng workspace khác (strict org filter).

## Deliverables
1. 10 cluster mới trong workspace Flowa.
2. ~150 keyword với volume/KD/intent/funnel/priority đầy đủ.
3. Báo cáo tóm tắt: top 10 priority, phân bố TOFU/MOFU/BOFU, gợi ý 5 landing page nên build trước.

## Câu hỏi nhanh trước khi chạy
1. **Workspace target**: dùng "Công ty CP Công nghệ Flowa" (`bccfec38-...`) đúng không, hay workspace khác?
2. **Vertical focus**: giữ trọng số 70% generic AI marketing + 30% beauty/aesthetic vertical, hay đảo lại (vertical là priority chính)?
3. **Locale**: ~80% VI + 20% EN (cho SEA expansion), OK không?

Nếu bạn approve mà không trả lời 3 câu trên, tôi sẽ dùng default: workspace Flowa, 70/30 generic/vertical, 80/20 VI/EN.