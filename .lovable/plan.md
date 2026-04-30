# Plan: Tối ưu Video Studio cho Short-form (≤90s)

## Vấn đề hiện tại

Wizard "Auto chạy hết" có 4 nhược điểm lớn cho short-form:

1. **Ngắt giữa chừng**: Sau khi submit scenes là `return` → user phải quay lại sau 1-3 phút bấm tiếp. Với 6-9 scenes × 3-5s thì UX bị gãy.
2. **Không có realtime**: Không listen `video_generations` → user phải F5 đoán khi nào xong.
3. **Audio scope sai**: Lấy `assets[0]` (mới nhất tổng) thay vì theo `script_id` → dễ ghép voiceover nhầm script khác.
4. **Bỏ qua subtitle** — yếu tố sống còn cho TikTok/Reels (85% xem tắt tiếng).
5. **Provider mặc định Veo 3** ($0.75/s) — đắt cho short-form social. Seedance 2 đủ chất lượng và rẻ ~10×.
6. **Tuần tự 800ms × N scene** + chờ render → tốn 20-30 phút. Có thể parallel.
7. **Aspect 2:3 / 4:5** force render 9:16 rồi `fit:cover` → crop hai bên thay vì smart-crop center.

## Mục tiêu

- **1-click thật sự**: Bấm "Auto" → 8-15 phút sau có MP4 hoàn chỉnh, không cần tương tác lại.
- **Real-time progress**: Hiển thị "Scene 3/9 đang quay (45%)" sống động.
- **Subtitle tự bật mặc định** cho 9:16 / 4:5 / 2:3 (vertical formats).
- **Parallel scenes**: Submit tất cả cùng lúc (provider tự queue), không sleep tuần tự.
- **Cost-aware**: Default Seedance 2 cho short-form, có toggle nâng cấp Veo.

## Thay đổi

### 1. `src/hooks/useVideoCompletion.ts` — viết lại flow
- **Realtime subscription** `video_generations` filter `script_id=eq.X` → cập nhật `completedScenesCount` live.
- **Parallel batch**: `Promise.allSettled` cho missing scenes thay vì for-loop sleep 800ms (provider queue tự xử lý rate-limit, đã có 402/429 handler).
- **Continuous flow**: Sau submit scenes, hàm KHÔNG return → poll mỗi 5s đến khi `completedScenesCount === scriptScenesCount` (timeout 8 phút) → tự động chạy tiếp Audio + Render.
- **Audio scope theo script**: Filter `assets` bằng `source_text.includes(activeScript.title)` hoặc thêm cột `script_id` (xem mục 5).
- **Auto-subtitle bước 4**: Sau khi render xong scene đầu tiên, gọi `generate-subtitles` với `script_id` (edge function đã hỗ trợ auto-resolve).
- **Provider selector**: Thêm param `provider: 'poyo' | 'geminigen'`, default `poyo` cho duration ≤6s.

### 2. `src/components/video/VideoCompletionWizard.tsx`
- Thêm step thứ 5 "Phụ đề" giữa BGM và Render.
- Progress bar tổng (% scenes done × 0.4 + audio 0.2 + render 0.4).
- Toggle "Tiết kiệm (Seedance)" / "Chất lượng cao (Veo)".
- ETA dynamic: `missingScenes × 90s + 120s render`.
- Khi `running === 'scenes'` hiển thị `3/9 ✓` thay vì spinner đơn điệu.

### 3. `supabase/functions/render-video-creatomate/index.ts`
- **Smart-crop cho 2:3 / 4:5**: Khi clip nguồn 9:16 mà output 2:3/4:5, dùng Creatomate `fit: "cover"` + `y_alignment: "center"` (đã có `fit:cover` nhưng thiếu alignment cho text-safe area).
- Thêm field `output_url_thumbnail` để Wizard preview ngay khi xong.

### 4. `supabase/functions/render-job-poller/index.ts` (đã có)
- Sau khi job `succeeded` → auto-trigger `generate-subtitles` với `output_url` để tạo SRT cho version sau (background, không block).

### 5. Migration: `audio_assets` + `script_id`
```sql
ALTER TABLE audio_assets ADD COLUMN script_id uuid REFERENCES scripts(id) ON DELETE SET NULL;
CREATE INDEX idx_audio_assets_script ON audio_assets(script_id, asset_type, created_at DESC);
```
Cập nhật `useAudioStudio.generateVoiceover/generateBGM` nhận thêm optional `script_id` và truyền vào edge functions để persist.

### 6. `src/hooks/useAudioStudio.ts` + 2 edge functions audio
- `generateVoiceover(text, voiceId, scriptId?)` → insert `script_id`.
- `generateBGM(prompt, dur, scriptId?)` → insert `script_id`.
- Wizard truyền `activeScript.id` → đảm bảo audio scope đúng.

### 7. Documentation
Cập nhật `.lovable/memory/features/video/audio-and-stitching-vn.md`:
- Wizard end-to-end behavior + realtime polling.
- Default provider matrix (Seedance ≤6s, Veo cho hero scene).
- Subtitle auto-on cho vertical aspect.

## Technical details

**Realtime polling pattern** (trong `useVideoCompletion`):
```ts
useEffect(() => {
  if (!activeScript) return;
  const ch = supabase.channel(`vg-${activeScript.id}`)
    .on('postgres_changes', {
      event: 'UPDATE', schema: 'public', table: 'video_generations',
      filter: `script_id=eq.${activeScript.id}`
    }, () => fetchGenerations())
    .subscribe();
  return () => { supabase.removeChannel(ch); };
}, [activeScript?.id]);
```

**Continuous runAuto** (no return giữa chừng):
```ts
if (missing.length > 0) {
  await Promise.allSettled(missing.map(submitScene)); // parallel
  // poll until done or timeout 8min
  await waitFor(() => completedScenesCount >= scriptScenesCount, 8 * 60_000);
}
// fall through to audio + render
```

**Cost matrix mới** cho short-form 60s (10 scenes × 6s):
- Seedance 2: ~$1.20 (10 × $0.12)
- Veo 3: ~$45 (10 × 6 × $0.75)
- Default Seedance trừ khi user chọn "Hero quality".

## Files

**Edited:**
- `src/hooks/useVideoCompletion.ts` (rewrite ~80%)
- `src/hooks/useAudioStudio.ts` (add `script_id` param)
- `src/components/video/VideoCompletionWizard.tsx` (add subtitle step + provider toggle + ETA)
- `supabase/functions/generate-voiceover/index.ts` (persist `script_id`)
- `supabase/functions/generate-bgm/index.ts` (persist `script_id`)
- `supabase/functions/render-video-creatomate/index.ts` (smart-crop alignment)
- `supabase/functions/render-job-poller/index.ts` (auto subtitle post-render)
- `.lovable/memory/features/video/audio-and-stitching-vn.md`

**New:**
- Migration `add_script_id_to_audio_assets.sql`

**Out of scope** (pha sau):
- Long-form >90s (cần multi-take stitching, B-roll injection).
- Music-Bed marketplace, lipsync, custom voice clone.
- Multi-language subtitle.

Bấm Approve để mình implement.