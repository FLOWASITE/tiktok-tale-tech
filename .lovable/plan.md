

# Sửa Logic Voice Region & Dialogue Style theo Định dạng

## Vấn đề (đã sửa lại đúng)

- **Video AI**: Voice Region **CÓ ý nghĩa** — AI TTS gen được giọng Bắc/Trung/Nam
- **Người thật (Teleprompter)**: Voice Region **VÔ nghĩa** — người đọc có giọng gì thì đọc giọng đó, không cần chỉ định
- **Production**: Tùy casting diễn viên, nhưng có thể ghi chú — giữ lại

## Giải pháp

### A. Ẩn Voice Region khi chọn Teleprompter
- **`ScriptFormStepper.tsx`**: Chỉ hiển thị Voice Region khi `script_purpose !== 'teleprompter'`

### B. Prompt bỏ dialect notes cho Teleprompter
- **`generate-script/index.ts`**: Không inject `dialect_notes` / `example_phrases` khi purpose = `teleprompter`

### C. Dialogue Style — giữ nguyên cả 3 format
- "Suy tư nội tâm" hợp lệ cho cả 3 (AI render được, người thật đọc được, production quay được) → không cần warning

## Files thay đổi

| File | Thay đổi |
|------|----------|
| `src/components/script/ScriptFormStepper.tsx` | Ẩn VoiceRegion khi `teleprompter` |
| `supabase/functions/generate-script/index.ts` | Bỏ dialect prompt khi `teleprompter` |

