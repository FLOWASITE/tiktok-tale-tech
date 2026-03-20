

# Tự động cải thiện kịch bản theo gợi ý AI

## Ý tưởng
Sau khi AI Analyzer đưa ra gợi ý (suggestions, weaknesses), thêm nút **"Áp dụng gợi ý"** để hệ thống tự động gọi AI viết lại kịch bản dựa trên các gợi ý đó — rồi cập nhật nội dung script.

## Luồng hoạt động

```text
[Phân tích AI] → Gợi ý cải thiện
       ↓
[Nút "AI Cải thiện"] → Gọi Edge Function "improve-script"
       ↓
AI nhận: script gốc + suggestions + weaknesses
       ↓
AI trả về: script đã cải thiện
       ↓
Hiển thị diff/preview → User xác nhận "Áp dụng"
       ↓
Lưu script mới + Re-analyze tự động
```

## Chi tiết kỹ thuật

### 1. Tạo Edge Function `improve-script`
- **Input**: `scriptContent`, `suggestions`, `weaknesses`, `topic`, `duration`, `videoType`, `scriptPurpose`
- **Logic**: Gửi script gốc + danh sách gợi ý cho AI, yêu cầu viết lại kịch bản giữ nguyên format (Prompt 1, Prompt 2...) nhưng cải thiện theo từng gợi ý
- **Output**: Script đã cải thiện (text)
- Dùng Lovable AI Gateway, model `google/gemini-3-flash-preview`

### 2. Tạo hook `useScriptImprovement`
- State: `isImproving`, `improvedContent`, `error`
- Function `improveScript(script, analysis)` → gọi edge function
- Function `applyImprovement()` → lưu `improvedContent` vào DB, cập nhật `script.content`

### 3. Cập nhật `ScriptAnalyzer.tsx`
- Thêm nút **"AI Cải thiện kịch bản"** ở cuối phần suggestions (chỉ hiện khi có suggestions hoặc weaknesses)
- Khi nhấn → gọi `improveScript`
- Hiển thị trạng thái loading "Đang cải thiện..."
- Khi có kết quả → hiện preview nội dung mới trong modal/sheet với 2 nút: "Áp dụng" và "Hủy"

### 4. Cập nhật `ScriptViewer.tsx`
- Truyền thêm `onScriptUpdate` callback vào `ScriptAnalyzer` để sau khi áp dụng cải thiện → cập nhật script hiển thị
- Sau khi áp dụng → tự động re-analyze script mới

## Files cần tạo/sửa

| File | Thay đổi |
|------|----------|
| `supabase/functions/improve-script/index.ts` | **Tạo mới** — Edge function nhận script + gợi ý, trả về script cải thiện |
| `src/hooks/useScriptImprovement.ts` | **Tạo mới** — Hook quản lý flow cải thiện |
| `src/components/script/ScriptAnalyzer.tsx` | Thêm nút "AI Cải thiện" + preview modal |
| `src/components/ScriptViewer.tsx` | Truyền `onScriptUpdate` vào ScriptAnalyzer |

