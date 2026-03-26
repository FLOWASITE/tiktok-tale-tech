

# Fix: ETA trên Pipeline Card không chính xác

## Nguyên nhân

Trong `supabase/functions/agent-pipeline/index.ts` (line 578), `estimated_completion` được hardcode:
```typescript
estimated_completion: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
// = luôn luôn +24 giờ từ lúc tạo
```

Pipeline thực tế chỉ mất ~2-10 phút → hiển thị "khoảng 24 giờ nữa" là sai hoàn toàn.

## Giải pháp

### 1. Backend: Tính ETA thực tế theo content_type

**File: `supabase/functions/agent-pipeline/index.ts`** (line ~578)

Thay hardcode 24h bằng ước tính hợp lý theo loại nội dung:

```typescript
const ETA_MINUTES: Record<string, number> = {
  multichannel: 5,
  carousel: 8,
  video_script: 4,
};
const etaMs = (ETA_MINUTES[contentType] || 6) * 60 * 1000;
estimated_completion: new Date(Date.now() + etaMs).toISOString(),
```

### 2. Frontend: Ẩn ETA khi pipeline đã hoàn thành

**File: `src/components/agents/PipelineKanban.tsx`** (line ~373)

Thêm điều kiện không hiển thị ETA nếu pipeline đã xong (`completed_at` có giá trị hoặc stage = `analyze`):

```tsx
{pipeline.estimated_completion && !pipeline.completed_at && pipeline.current_stage !== 'analyze' && (
  <span>...</span>
)}
```

**File: `src/components/agents/PipelineDetailDialog.tsx`** (line ~249) — tương tự.

### Phạm vi: 3 file
- `supabase/functions/agent-pipeline/index.ts` — sửa ETA calculation
- `src/components/agents/PipelineKanban.tsx` — ẩn ETA khi hoàn thành
- `src/components/agents/PipelineDetailDialog.tsx` — ẩn ETA khi hoàn thành

