

# Rà soát kế hoạch cải thiện Edge Functions — Trạng thái hiện tại

## Tổng quan: 4 Phase, đã hoàn thành phần lớn nhưng còn gaps quan trọng

---

## Phase 1 — Quick Wins

| Hạng mục | Trạng thái | Chi tiết |
|----------|-----------|----------|
| 1A. Singleton `getServiceClient()` | **~55% done** | 42 functions dùng `withPerf` (có singleton). Còn **~58 functions** dùng `serve()` cũ (legacy pattern) + **28 functions** dùng `Deno.serve(async` không có `withPerf`. Các function quan trọng chưa áp dụng: `generate-multichannel`, `chat-conversations`, `chat-topics`, `generate-core-content`, `topic-ai`, `kpi-ai`, `help-chatbot`, `sales-chatbot`, `overlay-text-canvas` |
| 1B. L1 Memory Cache | **Done** | `_shared/cache/memory-cache.ts` đã tạo, tích hợp vào `context-fetcher.ts` |
| 1C. Performance Middleware | **Done** | `_shared/middleware/perf.ts` đã tạo, ghi vào `edge_function_metrics` |

**Còn thiếu**: ~86 functions chưa áp dụng `withPerf` + singleton. Đặc biệt **10+ functions user-facing quan trọng** như `generate-multichannel` (5118 dòng), `chat-conversations`, `topic-ai`.

---

## Phase 2 — Consolidation

| Hạng mục | Trạng thái | Chi tiết |
|----------|-----------|----------|
| 2A. Social Publisher gateway | **Done** | `channel-publisher/index.ts` — router, frontend đã cập nhật |
| 2B. OAuth gateway | **Done** | `auth-gateway/index.ts` — router, frontend đã cập nhật |
| 2C. Social Diagnostics | **Done** | `social-diagnostics/index.ts` — router, frontend đã cập nhật |

**Lưu ý**: Các gateway hiện chỉ là **proxy** (gọi internal fetch đến function cũ). Chưa thực sự gộp logic — vẫn 130+ functions riêng lẻ, chỉ thêm 3 router layer.

---

## Phase 3 — AI & DB Optimization

| Hạng mục | Trạng thái | Chi tiết |
|----------|-----------|----------|
| 3A. Semantic Cache | **Partially done** | `_shared/cache/semantic-cache.ts` đã tạo, RPC `match_cached_ai_results` đã có. Nhưng **chưa được tích hợp** vào `generate-multichannel` hay `chat-conversations` (không tìm thấy `withSemanticCache` import trong các function chính) |
| 3B. Database Indexes | **Done** | 10 composite indexes đã tạo qua migration |
| 3C. Batch Query (RPC) | **Done** | `fetch_brand_context_batch` RPC đã tạo, tích hợp vào `context-fetcher.ts` |
| 3D. Materialized View | **Chưa làm** | `mv_resolved_compliance_rules` chưa được tạo, không có REFRESH cron |

---

## Phase 4 — Monitoring Dashboard

| Hạng mục | Trạng thái | Chi tiết |
|----------|-----------|----------|
| 4A. Metrics tables | **Done** | `edge_function_metrics` + `edge_function_daily_stats` + aggregate/cleanup functions |
| 4B. Admin Monitoring Page | **Done** | `EdgeFunctionMonitoring.tsx` với Recharts, tab trong `/admin/edge-functions` |

---

## Tổng kết: Việc còn phải làm (theo ưu tiên)

### Ưu tiên CAO — Tác động lớn đến hiệu năng
1. **Áp dụng `withPerf` + singleton cho ~10 functions user-facing quan trọng**: `generate-multichannel`, `chat-conversations`, `chat-topics`, `topic-ai`, `kpi-ai`, `generate-core-content`, `help-chatbot`, `sales-chatbot`, `overlay-text-canvas`, `ai-edit-channel`. Đây là các functions có traffic cao nhất, chưa được tối ưu cold start.

2. **Tích hợp Semantic Cache vào functions chính**: `withSemanticCache` đã viết nhưng chưa được gọi ở đâu cả — cần tích hợp vào `generate-multichannel` và `chat-conversations`.

### Ưu tiên TRUNG BÌNH
3. **Áp dụng `withPerf` cho ~76 functions còn lại** (admin, industry, payment, image processing...) — giúp monitoring dashboard có dữ liệu đầy đủ.

4. **Tạo Materialized View `mv_resolved_compliance_rules`** + REFRESH cron — giúp giảm query phức tạp cho Industry compliance.

### Ưu tiên THẤP
5. **Warm-up cron** cho top functions — giữ container sống, giảm cold start xuống gần 0.
6. **Gộp thực sự** (merge logic vào gateway thay vì proxy) — phức tạp, rủi ro cao, lợi ích marginal so với proxy pattern hiện tại.

---

## Đề xuất bước tiếp theo

Bắt đầu với **mục 1** (áp dụng `withPerf` + singleton cho 10 functions quan trọng nhất) vì:
- Tác động lớn nhất đến UX (cold start giảm 50-70%)
- Monitoring dashboard sẽ có data từ các functions traffic cao
- Không breaking change
- Thời gian: ~1 session

Bạn muốn thực hiện mục nào?

