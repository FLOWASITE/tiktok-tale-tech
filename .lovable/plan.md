## Mục tiêu

Từ một **Video Script** đã có aspect/duration preset (TikTok 30s 9:16, Pinterest 30s 2:3, FB Reels 90s 9:16, …), user bấm **"Tạo video"** một lần là ra file MP4 sẵn-đăng. Phạm vi V1 = mọi short-form ≤ 90s (TikTok, Reels, Shorts, FB Reels, Pinterest 2:3, Threads, Bluesky, WhatsApp). Long-form YouTube/LinkedIn để pha 2.

---

## Tình trạng pipeline hiện tại (audit)

```text
ScriptForm (preset) ──► Script DB (aspect 2:3/4:5/9:16/16:9/1:1)
                              │
                              ▼ navigate('/video', state.fromScript)
                     ScriptToVideoContext (scenes[])
                              │
              ┌───────────────┼──────────────────┐
              ▼               ▼                  ▼
        Quick Clip      Audio Studio       Storyboard tab
       (per-scene)      (VO/BGM/SRT)        (stitch)
              │               │                  │
              ▼               ▼                  ▼
       generate-video   generate-voiceover   render-video-
       + video-job-     + generate-bgm       creatomate
       poller (cron)    + generate-subtitles + render-job-poller
              │               │                  │
              └──► video_     └► audio_assets   └► video_render_
                   generations                     jobs
```

**5 pain point đang chặn user ra được MP4:**

1. **Aspect ratio mất chiều `2:3` & `4:5`**
   - `AspectRatioPicker.tsx` & `StoryboardVideoTab.tsx` chỉ có `9:16/16:9/1:1`.
   - `render-video-creatomate ASPECT_DIMS` cũng vậy → Pinterest 2:3 sẽ silent-fallback 9:16, sai dimension đăng lên platform.
   - `generate-video` truyền aspect tự do nhưng provider Veo/Seedance chỉ accept 9:16/16:9/1:1 → cần map "2:3 → 9:16 sinh thô + crop khi stitch", "4:5 → 9:16 sinh thô + crop".

2. **Studio không nhận preset từ Script**
   - Khi navigate từ Script vào Studio, `aspect`/`duration` của preset không pre-fill cho Storyboard tab (tab này hard-code default `9:16`). User phải tự chọn lại.
   - `currentScene.aspect` chỉ propagate xuống Quick Clip, không xuống Storyboard hay Audio.

3. **Audio Studio yếu liên kết script**
   - `Nạp từ kịch bản` đã có cho voiceover, nhưng:
     - **BGM duration** không tự khớp tổng duration script (default 15s, script 60s → nhạc cụt).
     - **Subtitles** không auto-pick clip mới nhất completed của script (user phải paste URL).
     - Không có quick-action "Tạo trọn bộ VO + BGM + SRT" trong 1 click.

4. **Không có "1-nút-ra-MP4" workflow**
   - User phải tự nhớ thứ tự: (1) batch quay scenes → (2) đợi → (3) qua Audio tạo VO → (4) qua Storyboard chọn clips + audio + render. Không có wizard hay state-machine kiểm tra "đã có gì / còn thiếu gì".
   - `StoryboardVideoTab` đã có batch-quay-scene nhưng tách rời với render — không tự auto-render khi xong batch.

5. **Lỗi vặt**
   - `generate-subtitles` validate `media_url` required nhưng UI chưa truyền `script_id` để auto-select clip.
   - `video-job-poller` dùng anon key gọi public endpoint nhưng `verify_jwt` setting cần xác nhận trong `config.toml`.
   - `useVideoRender` realtime channel không lọc `user_id` → user khác vẫn nhận event (chỉ noise, không leak vì RLS chặn select).

---

## Phạm vi V1 (short-form ≤ 90s)

✅ Implement
- Aspect 2:3 + 4:5 end-to-end (UI + render dimension + crop strategy)
- Studio nhận preset từ Script (aspect + duration + suggest BGM length)
- Audio Studio: quick-actions "Tạo trọn bộ Audio cho script này" (VO từ narration + BGM khớp duration + SRT từ clip mới nhất)
- **Wizard "Tạo video hoàn chỉnh"** — 1 panel mới ở đầu Storyboard, kiểm tra readiness và chạy batch → audio → render tuần tự
- Fix 5 lỗi vặt

❌ Pha 2 (không trong V1)
- Long-form > 90s (YouTube/LinkedIn dài)
- Multi-language SRT
- Custom transitions/effects giữa clips
- Brand watermark overlay

---

## Kế hoạch thực hiện

### Bước 1 — Mở rộng aspect ratio (FE + BE)

**Files**:
- `src/components/video/AspectRatioPicker.tsx`: thêm 2 option `2:3` (Pinterest), `4:5` (IG Portrait). 5 option total, group "Vertical / Portrait / Square / Landscape".
- `src/components/video/StoryboardVideoTab.tsx`: aspect state mở rộng union → `'9:16' | '16:9' | '1:1' | '2:3' | '4:5'`.
- `src/hooks/useVideoRender.ts`: cập nhật `RenderRequest.aspect_ratio` union.
- `supabase/functions/render-video-creatomate/index.ts`: 
  - `ASPECT_DIMS` thêm `'2:3': 1000×1500`, `'4:5': 1080×1350`.
  - Body interface mở rộng aspect union.
- `supabase/functions/generate-video/index.ts`:
  - Provider chỉ hỗ trợ 3 ratio gốc → map `2:3 → 9:16` và `4:5 → 9:16` khi gọi provider, đồng thời **lưu `aspect_ratio` gốc** ở `video_generations` để stitch crop về đúng kích thước cuối.
  - Thêm `target_aspect_ratio` field truyền qua tới Creatomate stitch để crop chuẩn.

### Bước 2 — Studio nhận preset từ Script

**Files**:
- `src/contexts/ScriptToVideoContext.tsx`:
  - Mở rộng `ActiveScript` thêm `aspectRatio?: AspectRatio`, `socialFormatId?: string`, `totalDuration?: number`.
  - Persist trong sessionStorage.
- `src/pages/ScriptNew.tsx` (hoặc nơi navigate sang Studio): truyền aspect + duration + presetId vào `state.fromScript.script`.
- `src/components/video/StoryboardVideoTab.tsx`:
  - useEffect: nếu `activeScript.aspectRatio` → `setAspect(activeScript.aspectRatio)`.
  - Hiển thị badge "Preset từ Script: TikTok 30s · 9:16" thay vì để user tự chọn.

### Bước 3 — Audio Studio quick-actions

**Files**:
- `src/components/video/AudioStudioTab.tsx`:
  - Thêm nút **"Tạo trọn bộ Audio"** (top, primary) gọi tuần tự:
    1. `generateVoiceover(scriptNarration, voiceId)`
    2. `generateBGM(brandTone || 'cinematic', totalDuration)` — duration tự khớp `activeScript.totalDuration`
    3. (defer) Subtitles tạo sau khi có clip render xong.
  - BGM duration default = `activeScript.totalDuration ?? 30` thay vì hard-code 15s.
  - Subtitles section: thêm select "Auto từ clip mới nhất của script" → lấy `latestScriptClip.video_url`.

### Bước 4 — Wizard "Tạo video hoàn chỉnh" (component mới)

**File mới**: `src/components/video/VideoCompletionWizard.tsx`

UI: 1 card sticky đầu Storyboard tab khi có `activeScript`. Hiển thị 4 step + status dot:

```text
Wizard ─────────────────────────────────────────────
[●] 1. Quay scenes        3/5 đã xong   [Quay tiếp]
[●] 2. Voiceover          Đã tạo        [Nghe]
[○] 3. Music nền          Chưa          [Tạo]
[○] 4. Render MP4         Chưa            (disabled)
                                  [Auto chạy hết]
─────────────────────────────────────────────────────
```

- Hook `useVideoCompletion(activeScript)` tổng hợp readiness từ `useVideoGeneration`, `useAudioStudio`.
- "Auto chạy hết" = sequential:
  1. Batch quay missing scenes (skip nếu đủ).
  2. Đợi tất cả `processing → completed` qua realtime hoặc poll mỗi 5s.
  3. Tạo VO + BGM song song nếu chưa có.
  4. Submit render với:
     - `clip_urls` = scenes theo thứ tự.
     - `voiceover_url`, `bgm_url`, `aspect_ratio` từ preset.
     - `burn_subtitles=false` ban đầu (subtitle generate sau khi có MP4).
  5. Sau khi render `completed` → optional: trigger `generate-subtitles` với `media_url = output_url` để có SRT cho lần publish.
- Toast progress + error handling từng bước; nếu 402/429 → dừng, hiện banner upgrade quota.

### Bước 5 — Fix lỗi vặt

- `src/hooks/useVideoRender.ts`: filter realtime channel `filter: 'user_id=eq.${user.id}'`.
- `supabase/functions/generate-subtitles/index.ts`: chấp nhận `script_id` → auto-resolve `media_url` từ clip mới nhất completed của script.
- `supabase/config.toml`: xác nhận `[functions.video-job-poller]` và `[functions.render-job-poller]` đều `verify_jwt = false` (cron-driven).
- `src/components/video/AudioStudioTab.tsx`: hiển thị warning khi voiceover dài > tổng duration script (nhắc người dùng cắt bớt narration hoặc chuyển preset dài hơn).

### Bước 6 — Cập nhật memory

- `mem://features/video/social-format-presets-vn.md`: thêm note "preset propagate xuống Studio qua ScriptToVideoContext.aspectRatio".
- Memory mới: `mem://features/video/end-to-end-pipeline-vn.md` — mô tả 4-step wizard, mapping 2:3/4:5 → provider 9:16 + Creatomate crop, BGM duration auto-khớp.

---

## Acceptance criteria

- [ ] Tạo Script TikTok 30s 9:16 → vào Studio → bấm 1 nút → ra MP4 1080×1920 download được.
- [ ] Tạo Script Pinterest 30s 2:3 → ra MP4 1000×1500 (không bị stretch).
- [ ] Tạo Script FB Reels 90s 9:16 (9 scenes × 10s) → batch quay xong → auto stitch + VO khớp 90s + BGM loop 90s.
- [ ] Khi 1 scene fail giữa batch → wizard pause, hiện nút retry scene đó, không huỷ toàn bộ.
- [ ] Quota video hết → wizard dừng ngay, hiện CTA upgrade, không charge thêm.

---

## Tech notes (chi tiết cho lập trình viên)

- Provider Veo/Seedance/Sora chỉ cho 9:16/16:9/1:1 → policy: sinh ở ratio nearest, lưu `source_aspect`, Creatomate crop bằng `fit: "cover"` + composition dims đúng target.
- `video-job-poller` chạy mỗi 30s qua pg_cron. Wizard không cần custom polling — dùng `useVideoGeneration` realtime đã có (`UPDATE` event trên `video_generations`).
- `render-video-creatomate` đã submit-only async + `render-job-poller` chạy mỗi 30s. Wizard subscribe `video_render_jobs` realtime để nhận `output_url`.
- Tổng cost ước tính per video (10 scenes 9:16 + VO + BGM + render): ~$0.50 — track bằng `cost_estimate` cột trên 3 bảng `video_generations`/`audio_assets`/`video_render_jobs`, tổng hợp cho `VideoCostTracker`.
- Không sửa `_shared/quota-units.ts` — đã đếm đúng `video` unit cho `generate-video` và `render-video-creatomate` (mỗi cái = 1 unit, wizard = 1 batch + 1 render = N+1 video units cần check trước khi chạy).
- Idempotency: wizard kiểm tra `completedSceneIds` từ context để skip scene đã quay; render submission de-dup bằng so sánh `source_clip_ids` mảng.

---

## Estimate

~6–8 file FE chỉnh + 2 edge function chỉnh + 1 component mới + 1 memory mới. Không migration DB. Test thủ công happy-path 3 preset (TikTok, Pinterest, FB Reels) là pass V1.
