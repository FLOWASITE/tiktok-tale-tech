

# Kế hoạch cải thiện Edge Functions theo tài liệu Technical Architecture Guide

Tài liệu đề xuất **8 phương án** tối ưu trong **8 tuần**. Sau khi đối chiếu với codebase hiện tại, nhiều phần đã được triển khai một phần. Dưới đây là đánh giá gap và kế hoạch thực hiện.

---

## Đánh giá hiện trạng: Đã có vs Chưa có

| Phương án | Tài liệu đề xuất | Codebase hiện tại | Gap |
|-----------|-------------------|--------------------|-----|
| 1. Consolidation (gộp 130→45) | Gộp theo domain | Chưa gộp, vẫn 130+ functions riêng lẻ | **100% chưa làm** |
| 2. Cold Start | Lazy import, global scope, warm-up | Chưa áp dụng lazy import, chưa có warm-up cron | **90% chưa làm** |
| 3. Multi-layer Caching | L1 Memory + L2 Redis + L3 Materialized Views | Có `redis-cache.ts`, có `ai_response_cache` table, có `cache-utils.ts` | **40% chưa làm** — thiếu L1 in-memory, thiếu materialized views |
| 4. AI API Optimization | Parallel calls, prompt consolidation, model tiering | Graph Engine đã parallel một phần, có model tiering trong `ai-provider.ts` | **50% chưa làm** — thiếu semantic cache, thiếu prompt consolidation |
| 5. DB Optimization | Connection pooling, indexes, batch queries, RPC | Có một số RPC functions, chưa có index strategy | **60% chưa làm** |
| 6. Rate Limiting & Circuit Breaker | Upstash rate limiter, circuit breaker | Đã có `rate-limiter.ts` (426 dòng) + `circuit-breaker.ts` (439 dòng, hybrid Redis) | **~80% đã làm** |
| 7. Monitoring | Structured logging, perf tracking | Đã có `logger.ts` (368 dòng) + `tracing.ts` + `cost-estimator.ts` | **~70% đã làm** — thiếu dashboard metrics |
| 8. Shared Code Architecture | Restructure _shared, middleware chain | Đã có `_shared/` tổ chức tốt (pipeline/, graph/, agents/, cache/) | **~75% đã làm** — thiếu middleware chain pattern |

---

## Kế hoạch triển khai theo ưu tiên (đã điều chỉnh cho thực tế)

### Phase 1 — Quick Wins (Tuần 1-2) | Không breaking change

**1A. Cold Start: Global Scope Connection Reuse**
- Áp dụng singleton pattern cho Supabase client ở global scope trong các function user-facing chính: `generate-multichannel`, `publish-*`, `chat-*`
- File: Sửa ~10-15 functions quan trọng nhất

**1B. L1 In-Memory Cache**
- Tạo `_shared/cache/memory-cache.ts` — LRU Map với TTL
- Áp dụng cho brand data, org config, subscription status
- Tích hợp vào `context-fetcher` pipeline

**1C. Performance Middleware**
- Tạo `_shared/middleware/perf.ts` — wrapper đo duration, cold start detection
- Ghi metrics vào bảng `edge_function_metrics` (tạo mới)
- Áp dụng cho top 20 functions

### Phase 2 — Consolidation nhẹ (Tuần 3-4) | Cẩn thận, cần test kỹ

**2A. Gộp Social Publisher (12→1)**
- Tạo `channel-publisher/index.ts` với internal router `?action=facebook|instagram|zalo|...`
- Giữ nguyên logic từng platform trong sub-handlers
- Cập nhật frontend `useDirectPublish.ts` để gọi function mới
- **Lưu ý**: Đây là nhóm dễ gộp nhất vì cùng pattern publish

**2B. Gộp OAuth callbacks (8→1)**
- Tạo `auth-gateway/index.ts` với router `?platform=zalo|facebook|...`
- Gộp: `zalo-oauth-callback`, `facebook-oauth-callback`, `instagram-oauth-callback`, `linkedin-oauth-callback`, `threads-oauth-callback`, `google-business-oauth-callback`

**2C. Gộp Social Tests (6→1)**
- Gộp `test-*-connection` và `test-*-credentials` vào `social-diagnostics`

### Phase 3 — AI & DB Optimization (Tuần 5-6)

**3A. Semantic Cache cho AI**
- Mở rộng bảng `ai_response_cache` hiện có với embedding column
- Tạo RPC `match_cached_ai_results` dùng cosine similarity
- Áp dụng cho `generate-multichannel`, `chat-conversations`

**3B. Database Indexes**
- Migration thêm composite indexes cho các bảng truy vấn nhiều nhất
- Tạo materialized view cho compliance rules (`mv_resolved_compliance_rules`)
- Thêm `REFRESH` cron schedule

**3C. Batch Query Pattern**
- Audit và sửa N+1 queries trong context-fetchers
- Chuyển complex logic vào PostgreSQL RPC functions

### Phase 4 — Monitoring Dashboard (Tuần 7-8)

**4A. Bảng `edge_function_metrics`**
- Tạo bảng ghi latency, error rate, cold start per function
- Trigger aggregate daily stats

**4B. Admin Monitoring Page**
- Mở rộng trang `/admin/edge-functions` hiện có
- Thêm: real-time latency charts, error rate trends, cost tracking
- Dữ liệu từ bảng metrics thay vì registry tĩnh

---

## Ước tính tác động

| Metric | Hiện tại | Sau Phase 1-2 | Sau Phase 3-4 |
|--------|----------|---------------|---------------|
| Số functions | 130+ | ~100 (gộp social) | ~80 |
| Cold start | 2-5s | 500ms-1.5s | 200-800ms |
| DB queries/request | 5-15 | 3-8 | 1-3 |
| AI cost/month | ~$500-1000 | ~$400-800 | ~$200-400 |

---

## Rủi ro và lưu ý

1. **Consolidation cần migration plan**: Khi gộp functions, cần giữ function cũ hoạt động song song trong 1-2 tuần trước khi xóa
2. **Frontend phải cập nhật song song**: Mỗi lần gộp function, phải sửa tất cả `supabase.functions.invoke()` calls tương ứng
3. **config.toml cần cập nhật**: Xóa entries cũ, thêm entries mới cho consolidated functions
4. **Redis dependency**: Phase 1B và 3A phụ thuộc Upstash Redis đã được cấu hình (hiện có trong `circuit-breaker.ts`)

---

## Đề xuất bắt đầu

Bắt đầu với **Phase 1A + 1B** (Cold Start + Memory Cache) vì:
- Không breaking change, không cần sửa frontend
- Tác động UX ngay lập tức
- Thời gian ~1 tuần
- Rủi ro thấp

Bạn muốn bắt đầu với phase nào?

