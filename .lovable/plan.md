# Avatar cho clip đầu + Chain frame giữa các clip

## Mục tiêu
- **(A)** Clip đầu tiên (scene 1) **bắt buộc** dùng `reference_image_url` (avatar gốc) của character chính, bỏ smart-pick angle — đảm bảo "first impression" đúng khuôn mặt nhất.
- **(B)** Clip 2, 3, ... tự động dùng **frame của clip trước** (cùng `script_id`) làm `starting_frame_url` để chuyển cảnh mượt và giữ identity ổn định hơn.

## Thay đổi

### 1. `supabase/functions/generate-video/index.ts`

**A. Avatar cho clip đầu** (sửa `pickRefForChar`, dòng ~213):
- Nếu `scene_number === 1` (hoặc không có scene_number) → ưu tiên `cp.reference_image_url` (avatar) trước, fallback `reference_images[0]`.
- Scene khác: giữ logic smart-pick angle hiện tại.

**B. Chain frame từ clip trước** (thêm block trước đoạn resolve character, ~dòng 175):
- Nếu `script_id` + `scene_number > 1` và **không** có `starting_frame_url` từ caller:
  - Query `video_generations`: `script_id = X AND scene_number = N-1 AND status = 'completed'` → lấy `thumbnail_url` (đã được Gemini/Veo trả về và lưu sẵn).
  - Nếu tồn tại → set `characterRefUrl = thumbnail_url`, set `userProvidedFrame = true` (để skip keyframe synthesis tốn credit, vì đã có ref tốt rồi).
  - Inject prompt anchor: `[CONTINUITY] This clip continues from previous scene. Match lighting, color grading, and character position from the reference frame.`
  - Vẫn giữ character block để Veo biết identity.

### 2. Lưu `last_frame_url` (optional, future-proof)

Hiện `video_generations` chỉ lưu `thumbnail_url` (= frame đầu của clip). Frame đầu của clip-N+1 = frame cuối clip-N về mặt narrative thì không khớp, nhưng:
- Thumbnail thường là frame đại diện (giữa clip với Gemini) → đủ tốt làm continuity hint.
- Không cần extract last-frame thật (đòi hỏi ffmpeg WASM, nặng) ở phase này.
- Nếu sau này muốn last-frame chính xác, thêm cột `last_frame_url` + 1 edge function extract bằng Mux/Shotstack API.

### 3. Không thay đổi
- `useScriptVideoBatch.ts`: client vẫn gọi tuần tự, KHÔNG cần truyền `starting_frame_url` — server tự query DB.
- `geminigen-video-generator.ts`: giữ nguyên field `input_image` (đã verified hoạt động).
- Logic collage multi-character: giữ nguyên cho scene 2+; scene 1 nếu là multi-char vẫn dùng collage (vì avatar đơn không đại diện được nhiều người).

## Edge cases
- Clip trước fail/chưa xong → fallback về logic character ref hiện tại (avatar/smart-pick).
- Aspect ratio/scene đổi giữa clip → vẫn dùng thumbnail (Veo tự crop theo aspect mới).
- User truyền `starting_frame_url` thủ công → ưu tiên cao nhất, bỏ qua chain.

## Test
1. Render lại từ kịch bản đa scene → check log `[generate-video] Chain from previous scene N-1 thumbnail`.
2. So sánh clip 1 vs clip 2: clip 1 phải bám avatar, clip 2 phải có composition gần clip 1.
3. Render scene đơn lẻ (scene_number=3 mà chưa có scene 2 completed) → fallback avatar/smart-pick, không lỗi.
