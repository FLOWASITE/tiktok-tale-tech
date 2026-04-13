

# Nâng cấp Agent Điều phối (Orchestrator) — 4 hướng

## Tổng quan

Nâng cấp toàn diện Orchestrator trên cả 2 tầng: Pipeline Orchestrator (`agent-pipeline`) và Chat Orchestrator (`orchestrator.ts`), kèm UI giám sát mới.

---

## Phase 1: Thông minh hơn trong phân công

### 1a. Dynamic Model Selection theo độ phức tạp
- **File**: `supabase/functions/agent-pipeline/index.ts`
- Thêm hàm `assessComplexity(pipeline)` phân tích: số kênh target, content_type, có campaign context không, có brand template không
- Trả về `complexity_level: 'simple' | 'medium' | 'complex'`
- Map complexity → model tier: simple → flash-lite, medium → flash, complex → pro
- Áp dụng trước mỗi stage (create, quality, approval) nếu không có agent model override

### 1b. Priority Queue cho Pipeline
- **File**: `supabase/functions/agent-pipeline/index.ts`
- Trong `create_from_plan`: sắp xếp pieces theo priority trước khi fire
- Pipeline urgent → fire ngay, normal → stagger 3s, low → stagger 8s
- Trong `check_scheduled_goals`: ưu tiên goal có deadline gần hơn

### 1c. Parallel Stage Optimization
- **File**: `supabase/functions/agent-pipeline/index.ts`
- Quality stage: chạy GEO, Compliance, Persona-fit song song với `Promise.allSettled` (hiện đang sequential)
- Giảm ~40% thời gian quality stage

---

## Phase 2: Tự phục hồi & Giám sát

### 2a. Enhanced Recovery với Root Cause Analysis
- **File**: `supabase/functions/agent-pipeline/index.ts` (action `recover_stuck`)
- Thêm phân loại lỗi: `timeout`, `ai_error`, `data_missing`, `publish_auth`
- Mỗi loại có chiến lược riêng (retry, backfill data, skip stage)
- Log `recovery_strategy` vào `agent_pipeline_logs`

### 2b. Orchestrator Health Dashboard
- **File mới**: `src/components/agents/OrchestratorHealthPanel.tsx`
- Hiển thị trong tab Tổng quan của Agent Dashboard
- Metrics: Pipeline throughput (24h), avg stage duration, bottleneck stage, recovery rate, stuck count
- Query từ `agent_pipeline_logs` + `agent_pipelines`
- Biểu đồ stage duration heatmap (stage × thời gian)

### 2c. Early Warning System
- **File**: `supabase/functions/agent-pipeline/index.ts`
- Trong `runStage`: nếu stage chạy > 80% estimated time → log warning
- Trong `recover_stuck`: nếu cùng stage fail > 3 lần across pipelines → tạo notification "Stage X có vấn đề hệ thống"

---

## Phase 3: Học từ dữ liệu quá khứ

### 3a. Pipeline Analytics Aggregation
- **File mới**: `supabase/functions/agent-orchestrator-analytics/index.ts`
- Action `compute_stats`: Tổng hợp từ `agent_pipeline_logs`:
  - Success rate per stage (7d, 30d)
  - Average duration per stage per content_type
  - Most common failure reasons
  - Intent fast-path hit rate trend
- Lưu kết quả vào bảng mới hoặc trả về trực tiếp

### 3b. DB Migration — Bảng thống kê
- Tạo bảng `orchestrator_daily_stats`:
  - `date`, `organization_id`, `total_pipelines`, `completed`, `failed`, `avg_duration_ms`, `avg_quality_score`, `stage_bottleneck`, `fast_path_hit_rate`, `top_failure_reason`
- Materialized view hoặc cron job tổng hợp hàng ngày

### 3c. Quality Gate Auto-tuning Suggestions
- Trong edge function analytics: nếu > 80% pipeline pass quality gate → gợi ý nâng ngưỡng
- Nếu > 30% bị flag → gợi ý hạ ngưỡng hoặc review rules
- Hiển thị suggestions trên Health Dashboard

---

## Phase 4: Điều phối đa chiến dịch

### 4a. Campaign Priority & Quota Manager
- **File**: `supabase/functions/agent-pipeline/index.ts`
- Trong `check_scheduled_goals` và `create_from_plan`:
  - Đếm pipeline đang chạy per org (quota check)
  - Nếu vượt quota (e.g. > 10 concurrent) → queue thay vì fire
  - Campaign với deadline gần hơn → priority cao hơn

### 4b. Schedule Conflict Detection
- **File**: `supabase/functions/agent-pipeline/index.ts` (trong `create_from_plan`)
- Trước khi tạo `content_schedules`: check trùng lịch (cùng channel, cùng ngày giờ ± 2h)
- Nếu conflict → shift lịch ± 3h hoặc log warning

### 4c. Multi-Campaign Dashboard UI
- **File**: `src/components/agents/AICampaignOverview.tsx`
- Thêm section "Campaign Timeline" overlay: hiển thị tất cả campaigns trên 1 timeline
- Highlight xung đột lịch, bottleneck resource
- Badge "X campaigns đang chạy đồng thời"

---

## Thứ tự triển khai đề xuất

| Ưu tiên | Thay đổi | Lý do |
|---------|----------|-------|
| 1 | Phase 1c: Parallel Quality | Quick win, giảm latency ngay |
| 2 | Phase 2a: Enhanced Recovery | Tăng độ tin cậy |
| 3 | Phase 4a: Campaign Quota | Ngăn quá tải |
| 4 | Phase 4b: Schedule Conflict | Tránh đăng trùng |
| 5 | Phase 1a: Dynamic Model | Tối ưu chi phí |
| 6 | Phase 3b+3a: Analytics DB + Function | Nền tảng cho học |
| 7 | Phase 2b: Health Dashboard | UI giám sát |
| 8 | Phase 1b: Priority Queue | Tinh chỉnh |
| 9 | Phase 2c: Early Warning | Cảnh báo sớm |
| 10 | Phase 3c: Auto-tuning | Tự tối ưu |
| 11 | Phase 4c: Multi-campaign UI | Trực quan hóa |

### Files tổng hợp
| File | Thay đổi |
|------|----------|
| `supabase/functions/agent-pipeline/index.ts` | Parallel quality, enhanced recovery, priority queue, complexity assessment, quota, conflict detection, early warning |
| `supabase/functions/agent-orchestrator-analytics/index.ts` | Tạo mới — edge function analytics |
| `src/components/agents/OrchestratorHealthPanel.tsx` | Tạo mới — dashboard giám sát |
| `src/components/agents/AICampaignOverview.tsx` | Thêm campaign timeline, conflict display |
| DB Migration | Bảng `orchestrator_daily_stats` |

