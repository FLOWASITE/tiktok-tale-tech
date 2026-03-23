

# GEO & AI Visibility Engine — Kế hoạch triển khai

## Tổng quan

Tài liệu đặc tả 5 module cho GEO Engine: (A) AI Brand Monitor, (B) GEO Content Optimizer, (C) Schema & Structure Engine, (D) Competitive AI Intelligence, (E) Action Center. Theo lộ trình trong tài liệu, Phase MVP (tháng 1-3) tập trung vào 3 module cốt lõi.

Dự án Flowa hiện có ~70 pages, ~130 components, ~100+ edge functions. GEO Engine sẽ là một nhóm tính năng mới hoàn toàn.

---

## Phân chia Phase MVP (triển khai trước)

### Phase 1: Hạ tầng & Database (Nền tảng)

**Database tables mới:**
- `geo_brand_monitors` — cấu hình theo dõi brand trên AI engines (brand_id, ai_engines[], keywords[], competitors[])
- `geo_monitoring_results` — kết quả mỗi lần scan (brand_monitor_id, ai_engine, prompt, response, mentions, citations, sentiment_score, scanned_at)
- `geo_content_scores` — GEO Score cho mỗi bài content (content_id, content_type, overall_score, factor_scores JSONB, issues JSONB, last_scored_at)
- `geo_prompt_clusters` — nhóm prompt theo industry (cluster_name, intent_type, sample_prompts[], volume_estimate, brand_appearance_rate)
- `geo_schema_outputs` — schema markup đã generate (content_id, schema_type, json_ld_code, status)
- `geo_action_tasks` — task từ Action Center (source_module, priority, title, description, brief JSONB, status, impact_score, effort_level)

**RLS policies:** Tất cả filter theo user_id hoặc organization_id qua brand ownership.

### Phase 2: Module A — AI Brand Monitor Dashboard

**Edge functions:**
- `geo-scan-brand` — Gửi prompt đến AI engines (ChatGPT, Gemini, Perplexity) qua Lovable AI supported models, phân tích response xem có mention brand không
- `geo-analyze-sentiment` — Phân tích sentiment của cách AI mô tả brand (-100 đến +100)
- `geo-aggregate-sov` — Tính Share of Voice từ kết quả scan

**UI pages & components:**
- `/geo` — GEO Dashboard chính (route mới + sidebar item mới trong nhóm "Quick Access")
- `GEODashboard.tsx` — Tổng quan SOV, Citation Rate, Sentiment trend
- `SOVChart.tsx` — Pie chart + trend line so sánh brand vs competitors
- `CitationTracker.tsx` — Danh sách URL được cite, trên platform nào
- `SentimentGauge.tsx` — Sentiment score -100 đến +100 với trend
- `VisibilityAlerts.tsx` — Cảnh báo spike/drop/new competitor
- `PromptExplorer.tsx` — "Search Console cho AI" — hiển thị prompts, clusters, gap prompts
- `GEOSetupWizard.tsx` — Wizard cấu hình brand monitor (chọn brand, thêm competitors, chọn AI engines)

### Phase 3: Module B — GEO Content Optimizer

**Edge functions:**
- `geo-score-content` — Chấm điểm GEO Score 0-100 dựa trên 8 yếu tố (answer-first, citation signals, structured data, entity clarity, heading hierarchy, content depth, freshness, extractability)
- `geo-optimize-suggestions` — Tạo gợi ý tối ưu Critical/Important/Improvement

**UI components:**
- `GEOScorePanel.tsx` — Hiển thị GEO Score tổng + breakdown 8 yếu tố (tích hợp vào trang content hiện tại)
- `GEOIssuesList.tsx` — Danh sách issues với 3 mức ưu tiên (đỏ/cam/xanh)
- `DualScoreComparison.tsx` — So sánh SEO Score vs GEO Score side-by-side
- Tích hợp GEO Score vào `MultiChannelCard.tsx` và `CoreContentPage.tsx` hiện tại

### Phase 4: Module C — Schema & Structure Engine

**Edge functions:**
- `geo-generate-schema` — Auto-generate JSON-LD schema (Article, FAQPage, HowTo, Product) từ content

**UI components:**
- `SchemaGenerator.tsx` — Preview + copy JSON-LD code
- `SchemaTypeSelector.tsx` — Chọn loại schema phù hợp
- Tích hợp nút "Generate Schema" vào content editor

### Phase 5: Module D & E — Competitive Intelligence & Action Center

**Edge functions:**
- `geo-track-competitors` — Scan competitors trên AI engines
- `geo-citation-gap-analysis` — So sánh citations brand vs competitor

**UI:**
- `CompetitorDashboard.tsx` — SOV comparison, citation sources
- `CitationGapList.tsx` — Golden opportunities
- `ActionCenter.tsx` — Task list với priority matrix (Quick Win/Strategic/Optimization/Research)
- `ActionTaskCard.tsx` — Card với brief chi tiết + nút "Generate Content"

---

## Chiến lược kỹ thuật

### AI Engine Integration
Sử dụng Lovable AI supported models (Gemini, GPT) để:
1. Gửi prompt giả lập người dùng → phân tích response có mention brand không
2. Phân tích sentiment của AI response
3. Chấm điểm GEO Score cho content
4. Generate schema markup

### Monitoring Schedule
- Edge function `geo-scan-brand` chạy theo batch, triggered bởi user hoặc cron
- Kết quả lưu vào `geo_monitoring_results` → aggregate thành SOV/trends
- Realtime enabled cho `geo_monitoring_results` và `geo_action_tasks`

### Navigation
- Thêm mục **"GEO Engine"** vào sidebar (icon: `Eye` hoặc `Radar`) trong nhóm Quick Access
- Sub-routes: `/geo`, `/geo/optimizer`, `/geo/schema`, `/geo/competitors`, `/geo/actions`

---

## Thứ tự triển khai đề xuất

| Bước | Module | Ước lượng |
|------|--------|-----------|
| 1 | Database tables + RLS | 1 session |
| 2 | GEO Dashboard UI (empty state + setup wizard) | 1 session |
| 3 | AI Brand Monitor scan logic (edge function) | 1-2 sessions |
| 4 | SOV + Citation + Sentiment charts | 1 session |
| 5 | Prompt Explorer | 1 session |
| 6 | GEO Content Optimizer (score + issues) | 1-2 sessions |
| 7 | Schema Generator | 1 session |
| 8 | Competitive Intelligence | 1-2 sessions |
| 9 | Action Center + closed-loop workflow | 1 session |

Tổng ước lượng MVP: ~10-12 sessions

---

## Lưu ý quan trọng

- **Vietnamese GEO đặc thù** (xử lý dấu, telex, Zalo tracking) sẽ được tích hợp ngay từ đầu vì Flowa đã có Localization Engine
- **Không cần API key bên ngoài** cho MVP — sử dụng Lovable AI models để query và phân tích
- **Tái sử dụng** hệ thống brand, industry packs, và content hiện có của Flowa

