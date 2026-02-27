

## Nâng cấp Model cho Agent Điều phối (Orchestrator)

### Thay đổi
Cập nhật model LLM trong hàm `planWithLLM` tại file `supabase/functions/_shared/graph/orchestrator.ts`:

- **Trước**: `google/gemini-2.5-pro`
- **Sau**: `google/gemini-3-pro-preview`

### Lý do chọn gemini-3-pro-preview
- Là thế hệ kế tiếp trực tiếp của gemini-2.5-pro, tương thích API hoàn toàn
- Cải thiện khả năng reasoning và phân loại ý định (intent classification) -- đây chính là nhiệm vụ chính của Orchestrator
- Orchestrator chỉ gọi LLM 1 lần/workflow với input ngắn (user message + context), nên chi phí tăng không đáng kể
- Temperature đã set 0.1 (deterministic), phù hợp với model reasoning mạnh

### Chi tiết kỹ thuật

**File**: `supabase/functions/_shared/graph/orchestrator.ts`
**Dòng 491**: Thay `"google/gemini-2.5-pro"` thành `"google/gemini-3-pro-preview"`

Chỉ 1 dòng code thay đổi, không ảnh hưởng logic khác.
