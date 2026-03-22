

# Rà soát kế hoạch cải thiện Edge Functions — Trạng thái hiện tại

## Tổng quan: 4 Phase — ĐÃ HOÀN THÀNH CƠ BẢN

---

## Phase 1 — Quick Wins ✅

| Hạng mục | Trạng thái | Chi tiết |
|----------|-----------|----------|
| 1A. Singleton `getServiceClient()` + `withPerf` | **✅ Done** | **127/127 functions** đã áp dụng `withPerf` + singleton pattern. Custom slowThresholdMs cho từng nhóm (AI: 30-60s, batch: 120s, default: 10s) |
| 1B. L1 Memory Cache | **✅ Done** | `_shared/cache/memory-cache.ts` đã tạo, tích hợp vào `context-fetcher.ts` |
| 1C. Performance Middleware | **✅ Done** | `_shared/middleware/perf.ts` đã tạo, ghi vào `edge_function_metrics` |

---

## Phase 2 — Consolidation ✅

| Hạng mục | Trạng thái | Chi tiết |
|----------|-----------|----------|
| 2A. Social Publisher gateway | **✅ Done** | `channel-publisher/index.ts` — router, frontend đã cập nhật |
| 2B. OAuth gateway | **✅ Done** | `auth-gateway/index.ts` — router, frontend đã cập nhật |
| 2C. Social Diagnostics | **✅ Done** | `social-diagnostics/index.ts` — router, frontend đã cập nhật |

---

## Phase 3 — AI & DB Optimization ✅

| Hạng mục | Trạng thái | Chi tiết |
|----------|-----------|----------|
| 3A. Semantic Cache | **✅ Done** | Tích hợp vào `improve-script`, `optimize-ad-copy`, `summarize-conversation`. `generate-multichannel` dùng SSE streaming nên không áp dụng semantic cache |
| 3B. Database Indexes | **✅ Done** | 10 composite indexes đã tạo qua migration |
| 3C. Batch Query (RPC) | **✅ Done** | `fetch_brand_context_batch` RPC đã tạo, tích hợp vào `context-fetcher.ts` |
| 3D. Materialized View | **Chưa làm** | `mv_resolved_compliance_rules` chưa được tạo — ưu tiên thấp |

---

## Phase 4 — Monitoring Dashboard ✅

| Hạng mục | Trạng thái | Chi tiết |
|----------|-----------|----------|
| 4A. Metrics tables | **✅ Done** | `edge_function_metrics` + `edge_function_daily_stats` + aggregate/cleanup functions |
| 4B. Admin Monitoring Page | **✅ Done** | `EdgeFunctionMonitoring.tsx` với Recharts, tab trong `/admin/edge-functions` |

---

## Còn lại — Ưu tiên THẤP

1. **Materialized View `mv_resolved_compliance_rules`** + REFRESH cron — giúp giảm query phức tạp cho Industry compliance
2. **Warm-up cron** cho top functions — giữ container sống, giảm cold start xuống gần 0
3. **Gộp thực sự** (merge logic vào gateway thay vì proxy) — phức tạp, rủi ro cao, lợi ích marginal

---

## Tổng kết

- **127 functions** đều có `withPerf` monitoring + singleton pattern
- **3 gateway** consolidation (channel-publisher, auth-gateway, social-diagnostics) 
- **Semantic Cache** tích hợp vào 3 AI functions (improve-script, optimize-ad-copy, summarize-conversation)
- **Monitoring Dashboard** hoạt động với dữ liệu realtime từ tất cả functions
