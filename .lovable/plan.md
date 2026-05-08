## Đổi nhãn CTA Step 3 cho Video AI

**File:** `src/components/script/ScriptFormStepper.tsx` line 1252.

Thay:
```tsx
{generatedScript ? 'Tạo lại (thay thế)' : 'Tạo kịch bản AI'}
```
thành:
```tsx
{generatedScript ? 'Tạo lại (thay thế)' : (isVideoAi ? 'Tạo kịch bản & Quay' : 'Tạo kịch bản AI')}
```

Khi `isVideoAi=true` và chưa có script → button hiển thị **"Tạo kịch bản & Quay"** (khớp tiêu đề step). Các trường hợp khác giữ nguyên.
