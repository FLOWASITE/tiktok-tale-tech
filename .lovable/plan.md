## Chẩn đoán

Triệu chứng: bấm "Tạo Video" trong Storyboard kịch bản → không có gì xảy ra, gallery vẫn rỗng.

Bằng chứng:
- Edge function logs `generate-video`: **không có request nào** trong cửa sổ thời gian gần đây → request không bao giờ rời client.
- Session replay: user thao tác trên panel (đổi provider checkbox) nhưng không có spinner "Đang tạo video..." xuất hiện.
- Code review `src/components/script/VideoGeneratorPanel.tsx`:
  - `prompt` được khởi tạo từ `scene?.promptText` chỉ **một lần** ở `useState(scene?.promptText || '')`. Nếu scene chưa load xong khi panel mount (hoặc đổi scene), state `prompt` vẫn rỗng.
  - `handleGenerate` có `if (!prompt.trim()) return;` — return im lặng, không toast.
  - Button `disabled={!prompt.trim()}` → user click không có phản hồi nào.

Kết quả: với scene có `promptText` đến muộn, button luôn disabled hoặc handler bỏ qua → người dùng tưởng "không tạo được".

## Sửa

**File**: `src/components/script/VideoGeneratorPanel.tsx`

1. Thêm `useEffect` đồng bộ `prompt` mỗi khi `scene?.promptText` thay đổi (chỉ khi user chưa gõ tay):
   - Track `isPromptDirty` (set true khi user gõ).
   - Nếu `!isPromptDirty` và `scene?.promptText` đổi → setPrompt theo scene.

2. Trong `handleGenerate`:
   - Nếu `!prompt.trim()` → `toast.error('Vui lòng nhập prompt mô tả cảnh quay')` thay vì return im lặng.
   - Bọc try/catch quanh `await generateVideo(...)`, log lỗi và toast nếu throw.

3. Thêm hint dưới textarea khi prompt rỗng nhưng có scene: gợi ý "Scene chưa có mô tả — hãy nhập prompt thủ công".

## Kỹ thuật

```text
[Mount panel] → prompt = scene.promptText || ''
                 ↓ (scene update đến sau)
[useEffect] → if !dirty && scene.promptText → setPrompt(scene.promptText)

[Click Generate]
  ├─ empty? → toast.error (không return im lặng)
  └─ valid → generateVideo() + try/catch toast
```

Không thay đổi edge function, không thay đổi `useVideoGeneration` hook (đã có toast 402/429 đầy đủ).

## Kiểm thử

Sau khi fix:
1. Mở 1 script ai_video, vào tab Storyboard, mở "Text-to-Video Generator" của 1 scene → prompt phải tự điền `scene.promptText`.
2. Click "Tạo Video" với prompt rỗng → thấy toast "Vui lòng nhập prompt".
3. Click với prompt hợp lệ → thấy spinner + toast "Video đang được tạo nền".
4. Check `generate-video` logs → có request mới.
