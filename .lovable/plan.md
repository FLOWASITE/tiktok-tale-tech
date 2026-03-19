

# Tối ưu generate-carousel: Sửa bug metrics + Cải thiện prompt

## 1. Sửa bug metrics (hardcoded model & token)

**Vấn đề**: Lines 878-904 hardcode `google/gemini-2.5-flash` và ước tính token cố định thay vì dùng dữ liệu thực từ AI response.

**Giải pháp**: Chuyển sang dùng `callAIWithMetrics()` (đã có sẵn trong `ai-provider.ts`) thay vì `callAI()` + `saveMetrics()` thủ công. Function này tự động:
- Trích xuất token thực từ response (`usage.prompt_tokens`, `usage.completion_tokens`)
- Dùng đúng model thực tế (từ `result.model`)
- Tính cost chính xác bằng `estimateCost()`
- Tự động lưu metrics

**Thay đổi cụ thể**:
- Import `callAIWithMetrics` thay vì `callAI`
- Trong `generateAIContent()`, gọi `callAIWithMetrics(supabase, {...})` với `userId`, `brandTemplateId`
- Xóa toàn bộ block metrics thủ công (lines 878-904)

## 2. Cải thiện chất lượng prompt

**Vấn đề hiện tại**:
- System prompt quá dài (~100 dòng), chứa cả ví dụ cứng cho Ideogram
- Vẫn tham chiếu `aiTool` (đã bỏ trên UI) → prompt thừa
- Không có hướng dẫn rõ về kỹ thuật viết text overlay (vì ảnh carousel dùng Satori overlay, không cần AI vẽ chữ)

**Giải pháp**:
- Loại bỏ toàn bộ `aiToolPromptGuide` section vì UI đã bỏ AI Tool selector
- Đơn giản hóa `fullPrompt` instruction: tập trung vào **background image** (vì text được overlay bằng Satori)
- Thêm hướng dẫn rõ: "fullPrompt là prompt tạo ảnh nền, KHÔNG cần vẽ chữ trên ảnh vì text sẽ được overlay sau"
- Cập nhật user prompt bỏ tham chiếu `aiTool`

### Files cần sửa

**`supabase/functions/generate-carousel/index.ts`**:
1. Import `callAIWithMetrics` thay vì `callAI as callAIProvider`
2. Xóa `aiToolPromptGuide` object (lines 415-433)
3. Cập nhật system prompt: bỏ AI tool section, thêm hướng dẫn background-only prompt
4. Cập nhật user prompt: bỏ `AI Image Tool` line
5. Thay `callAIProvider()` bằng `callAIWithMetrics()` trong `generateAIContent`
6. Xóa block metrics thủ công (lines 878-904)

