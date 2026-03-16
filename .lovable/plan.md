

## Vấn đề: "Text trên ảnh" vẫn hiện trong chế độ "AI tự lo"

### Nguyên nhân

Trong `ImageAdvancedOptions.tsx`:
- Line 340-344: Chế độ `full` thay toggle bằng nhãn "AI tự quyết định nội dung text trên ảnh" — đúng
- Line 361: `{enableTextOverlay && (` — block hiển thị ô nhập text **không kiểm tra `promptMode`**, nên khi `enableTextOverlay = true` (được auto-bật cho `full` mode), ô text vẫn hiện ra

### Kế hoạch sửa

**File:** `src/components/multichannel/ImageAdvancedOptions.tsx`

Thêm điều kiện `promptMode !== 'full'` vào line 361:

```typescript
{enableTextOverlay && promptMode !== 'full' && (
```

Khi ở chế độ "AI tự lo", chỉ hiện nhãn thông tin, ẩn toàn bộ phần nhập text (Chung/Theo kênh, Textarea, AI sửa chữ). AI sẽ tự quyết định nội dung text dựa trên context có sẵn.

Thay đổi 1 dòng, 1 file.

