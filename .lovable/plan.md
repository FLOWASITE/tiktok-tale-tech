

# Bỏ hoàn toàn Self-Review khỏi Creator Agent

## Tổng quan

Self-Review hiện tốn 1 lần gọi AI (gemini-2.5-flash) mỗi pipeline, đóng góp 25% trọng số vào Quality Score. Vì các bước downstream (Quality Agent) đã có GEO, Compliance, Persona-fit đánh giá kỹ hơn, self-review là dư thừa.

## Phạm vi thay đổi

### 1. Xóa self-review khỏi Creator Agent backend
**File:** `supabase/functions/agent-creator-v2/index.ts`

- Xóa interface `SelfReviewScores` (dòng 61-71)
- Xóa field `self_review` khỏi `CreatorResult` (dòng 79)
- Xóa toàn bộ function `selfReview()` (dòng 149-244)
- Xóa helpers `parseJsonFromLLM()` và `clamp()` (dòng 699-711) — chỉ dùng cho self-review
- Xóa 3