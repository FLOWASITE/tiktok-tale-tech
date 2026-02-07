

# Kế hoạch Fix: Nội dung Đa kênh Hiển thị Năm Cũ (2025 thay vì 2026)

## Nguyên nhân gốc rễ

Tôi đã phân tích code và phát hiện:

**`generate-multichannel/index.ts` KHÔNG có thông tin ngày tháng hiện tại trong System Prompt!**

Trong khi `system-prompt-builder.ts` (dùng cho chat-topics) có đầy đủ:
```typescript
const currentYear = vnTime.getUTCFullYear(); // 2026
// ...
- **Ngày hiện tại:** ${dayOfWeek}, ngày ${currentDay} ${currentMonth} năm ${currentYear}
```

Nhưng hàm `getSystemPrompt()` trong `generate-multichannel` hoàn toàn thiếu thông tin này, khiến AI sử dụng dữ liệu training data cũ (năm 2025).

## Giải pháp

Thêm **Date Context Section** vào đầu System Prompt trong `getSystemPrompt()`.

### File: `supabase/functions/generate-multichannel/index.ts`

**Thêm helper function (sau dòng ~1065):**
```typescript
/**
 * Build current date context section for system prompt
 * Ensures AI knows the current date/year
 */
function buildDateContextSection(): string {
  const now = new Date();
  const vnTimeOffset = 7 * 60 * 60 * 1000; // UTC+7
  const vnTime = new Date(now.getTime() + vnTimeOffset);
  
  const dayOfWeekNames = ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy'];
  const monthNames = ['tháng 1', 'tháng 2', 'tháng 3', 'tháng 4', 'tháng 5', 'tháng 6', 'tháng 7', 'tháng 8', 'tháng 9', 'tháng 10', 'tháng 11', 'tháng 12'];
  
  const dayOfWeek = dayOfWeekNames[vnTime.getUTCDay()];
  const currentMonth = monthNames[vnTime.getUTCMonth()];
  const currentYear = vnTime.getUTCFullYear();
  const currentDay = vnTime.getUTCDate();
  const currentDateISO = vnTime.toISOString().split('T')[0];
  
  return `## 📅 THÔNG TIN THỜI GIAN HIỆN TẠI
- **Ngày hiện tại:** ${dayOfWeek}, ngày ${currentDay} ${currentMonth} năm ${currentYear} (${currentDateISO})
- **Múi giờ:** Vietnam (UTC+7)

⚠️ QUAN TRỌNG: Sử dụng năm ${currentYear} trong tất cả nội dung. KHÔNG sử dụng năm cũ (${currentYear - 1} hoặc trước đó).
`;
}
```

**Inject vào System Prompt (trong hàm `getSystemPrompt`, dòng ~1176):**

Thay đổi từ:
```typescript
return `Bạn là SOCIAL CHANNEL SETTINGS ENGINE - tạo NỘI DUNG ĐA KÊNH cho ${audienceDescription}.

${brandVoiceSection}
...
```

Thành:
```typescript
const dateContextSection = buildDateContextSection();

return `Bạn là SOCIAL CHANNEL SETTINGS ENGINE - tạo NỘI DUNG ĐA KÊNH cho ${audienceDescription}.

${dateContextSection}
${brandVoiceSection}
...
```

## Kết quả mong đợi

**Trước:**
```
System Prompt: "Bạn là SOCIAL CHANNEL SETTINGS ENGINE - tạo NỘI DUNG..."
→ AI sử dụng năm từ training data (2025)
```

**Sau:**
```
System Prompt: "Bạn là SOCIAL CHANNEL SETTINGS ENGINE...
## 📅 THÔNG TIN THỜI GIAN HIỆN TẠI
- **Ngày hiện tại:** Thứ sáu, ngày 7 tháng 2 năm 2026 (2026-02-07)
- **Múi giờ:** Vietnam (UTC+7)
⚠️ QUAN TRỌNG: Sử dụng năm 2026..."
→ AI biết năm hiện tại và sử dụng đúng
```

## Files cần chỉnh sửa

| File | Thay đổi |
|------|----------|
| `supabase/functions/generate-multichannel/index.ts` | Thêm `buildDateContextSection()` helper và inject vào system prompt |

## Chi tiết kỹ thuật

- Helper function `buildDateContextSection()` tính toán thời gian theo múi giờ Vietnam (UTC+7)
- Section được inject ở **đầu** system prompt (sau câu giới thiệu) để đảm bảo AI "ghi nhớ"
- Thêm cảnh báo rõ ràng "KHÔNG sử dụng năm cũ" để tránh AI fallback về training data
- Cùng format với `system-prompt-builder.ts` để đồng bộ codebase

