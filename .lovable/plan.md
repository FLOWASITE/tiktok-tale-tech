

## Phân tích: Tại sao 1 bài viết tạo nội dung 2 lần

### Bằng chứng từ logs

Edge Function `generate-multichannel` được gọi **2 lần riêng biệt** cho cùng 1 bài viết:

```text
03:59:45 → Saved content ID: 87562d06 (Task: e76b4b62)
04:00:18 → Saved content ID: 4ed92630 (Task: 469c96f2)
```

Cùng tiêu đề, cùng topic, cùng thời điểm boot (03:59:46). Hai task ID khác nhau = hai request riêng biệt từ frontend.

### Nguyên nhân gốc

File `MultiChannelFormWizard.tsx` có **2 code path** đều gọi `onGenerate`:

1. **Path trực tiếp** (line 830-837): `handleSubmit` → kiểm tra `hasCoreContent` = true → `onGenerate()`
2. **Path useEffect** (line 841-856): Auto-trigger khi `pendingMultiChannelGeneration = true` VÀ `hasCoreContent` trở thành true

**Race condition xảy ra khi:**
- User nhấn submit lần đầu → Core Content chưa sẵn sàng → `setPendingMultiChannelGeneration(true)` → return early
- Core Content hoàn tất → `useEffect` fire → gọi `onGenerate` (lần 1)
- Nhưng `useEffect` deps gồm cả `coreContentData?.id` VÀ `formData.coreContentId` — cả hai có thể thay đổi gần nhau → **useEffect fire 2 lần**
- Hoặc: user double-click nhanh, `submittingRef` check chỉ có trong `handleSubmit` nhưng **KHÔNG có trong useEffect**

Quan trọng: `useEffect` ở line 844 kiểm tra `!isGenerating` — nhưng `isGenerating` state update là async, nên lần gọi thứ 2 có thể chạy trước khi `isGenerating` được set thành true.

### Kế hoạch sửa

**File:** `src/components/multichannel/MultiChannelFormWizard.tsx`

1. **Thêm `submittingRef` guard vào useEffect** (line 844):
   ```typescript
   if (pendingMultiChannelGeneration && hasCoreContent && !isGenerating 
       && !isGeneratingCoreContent && !submittingRef.current) {
     submittingRef.current = true;
     // ...
   }
   ```

2. **Thêm `setPendingMultiChannelGeneration(false)` NGAY TRƯỚC khi gọi onGenerate** trong useEffect để ngăn effect fire lần 2:
   ```typescript
   setPendingMultiChannelGeneration(false); // Clear flag TRƯỚC khi gọi
   submittingRef.current = true;
   onGenerate(...)
   ```

3. **Thêm guard trong `useStreamingGeneration.ts`** — `generatingRef` đã có nhưng cần verify nó hoạt động đúng khi 2 request gửi gần nhau (hiện tại task ID khác nhau cho thấy cả 2 request đều pass qua guard).

### Tác động
- 1 file sửa chính (`MultiChannelFormWizard.tsx`)
- 1 file verify (`useStreamingGeneration.ts`) 
- Không breaking change — chỉ thêm guard logic

