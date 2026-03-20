

# Hoàn thiện chức năng Phân tích AI

## Vấn đề hiện tại

1. **Không dùng cache**: `ScriptAnalyzer` luôn yêu cầu phân tích mới, bỏ qua `analysis_cache` đã lưu trên bảng `scripts` (auto-analyze chạy khi tạo script nhưng kết quả không được hiển thị)
2. **JSON parsing không ổn định**: Edge function dùng regex `content.match(/\{[\s\S]*\}/)` để parse JSON từ free-text — dễ lỗi. Nên dùng tool calling để nhận structured output
3. **Fallback trả dữ liệu giả**: Khi parse lỗi, trả về điểm cố định (65, 70, 55...) — gây hiểu nhầm cho user
4. **Không lưu kết quả khi phân tích thủ công**: Khi user nhấn "Phân tích ngay" trong ScriptAnalyzer, kết quả không được lưu vào `analysis_cache`

## Giải pháp

### A. ScriptAnalyzer — Dùng cached analysis
- Nhận thêm prop `initialAnalysis` từ `script.analysis_cache`
- Nếu đã có cache → hiển thị ngay, không cần nhấn nút
- Nút "Phân tích lại" để gọi AI mới
- Sau khi phân tích xong → cập nhật `analysis_cache` trên DB

### B. Edge function — Chuyển sang tool calling
- Thay vì yêu cầu AI trả JSON trong text, dùng `tools` + `tool_choice` để nhận structured output chính xác
- Loại bỏ regex parsing và fallback dữ liệu giả
- Khi tool call không trả về → báo lỗi rõ ràng thay vì trả dữ liệu fake

### C. useScriptAnalysis — Lưu kết quả
- Sau khi phân tích thành công → gọi `supabase.from('scripts').update({ analysis_cache, analyzed_at })` để cache
- Nhận `scriptId` làm tham số

### D. ScriptViewer — Truyền cache
- Truyền `script.analysis_cache` vào `ScriptAnalyzer` để hiển thị ngay khi mở panel

## Chi tiết kỹ thuật

| File | Thay đổi |
|------|----------|
| `supabase/functions/analyze-script/index.ts` | Chuyển sang tool calling, bỏ regex parse, bỏ fallback giả |
| `src/hooks/useScriptAnalysis.ts` | Thêm `scriptId`, lưu kết quả vào DB sau phân tích |
| `src/components/script/ScriptAnalyzer.tsx` | Nhận `initialAnalysis` prop, hiển thị cache, nút "Phân tích lại" |
| `src/components/ScriptViewer.tsx` | Truyền `script.analysis_cache` vào ScriptAnalyzer |

