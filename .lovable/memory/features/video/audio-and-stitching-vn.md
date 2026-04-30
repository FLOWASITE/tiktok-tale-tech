---
name: Video Audio & Stitching Pipeline
description: ElevenLabs TTS/Music/STT + Creatomate stitching cho Video Studio Phase 4-6 + Wizard end-to-end short-form
type: feature
---

# Video Studio Phase 4-6 Architecture

## Audio Studio (ElevenLabs)
- **Voiceover**: `generate-voiceover` → ElevenLabs TTS `eleven_multilingual_v2`, default voice Sarah (EXAVITQu4vr4xnSDxMaL), upload to `audio-assets` public bucket, persist trong `audio_assets` table với **`script_id` để scope theo kịch bản**
- **BGM**: `generate-bgm` → ElevenLabs Music API (`/v1/music`), prompt MUST be `prompt` not `text`, duration **5-120s** (mở rộng từ 30s để khớp short-form), persist `script_id`
- **Subtitles**: `generate-subtitles` → ElevenLabs `scribe_v2` STT, output cả SRT + VTT (chunk ~7 từ hoặc 3s); auto-resolve `media_url` từ `script_id` (clip mới nhất completed); persist `script_id`

## Stitching (Creatomate)
- **Submit**: `render-video-creatomate` → Creatomate `/v1/renders` với JSON source: video clips track 1 (sequential, `fit:cover` + center anchor cho smart-crop 2:3/4:5), voiceover track 2 vol=1.0, BGM track 3 ducked vol=0.2 loop=true, subtitles track 4 với `text_transcript_source` field cho burn-in
- **Poll**: `render-job-poller` chạy cron 30s, max 60 attempts (30 min timeout)
- **Aspect dims**: 9:16=1080x1920, 16:9=1920x1080, 1:1=1080x1080, **2:3=1000x1500 (Pinterest), 4:5=1080x1350 (IG portrait)**, frame_rate=30
- **Smart-crop**: Veo/Seedance chỉ accept 9:16/16:9/1:1 → wizard tạo 9:16 rồi center-crop khi stitch sang 2:3/4:5

## Wizard end-to-end (short-form ≤90s) — V2
**`useVideoCompletion` + `VideoCompletionWizard`** hoàn thiện 1-click flow:
1. **Submit PARALLEL** tất cả missing scenes (Promise.allSettled, không sleep tuần tự)
2. **Poll continuous** (5s tick, fallback fetchGenerations mỗi 15s) đến khi đủ scenes hoặc timeout 8 phút — KHÔNG return giữa chừng
3. **Audio parallel** VO + BGM (đều scope `script_id`)
4. **Render** với SRT auto-bật burn nếu có
5. **Background auto-subtitle** sau render (fire-and-forget, dùng clip đầu)

**Provider tier toggle**:
- `fast` (default): `poyo/seedance-2` ~$0.12/scene → 60s clip ~$1.20
- `hero`: `geminigen/veo-3-fast` ~$0.40/s → 60s clip ~$24

## Tables
- `video_render_jobs`: storyboard_id, source_clip_ids[], voiceover_url, bgm_url, subtitle_srt, burn_subtitles, aspect_ratio, output_url, provider_render_id, status, progress, poll_attempts. Realtime enabled.
- `audio_assets`: asset_type (voiceover/music/sfx/subtitle), source_text/prompt, voice_id, duration_seconds, audio_url, srt_content, vtt_content, cost_estimate, **script_id** (FK scripts ON DELETE SET NULL, indexed (script_id, asset_type, created_at DESC))

## Storage Buckets
- `audio-assets` (public): user_id/voiceover-{ts}.mp3, user_id/bgm-{ts}.mp3
- `video-renders` (public): final stitched videos

## Frontend
- `useAudioStudio`: gen voiceover/BGM/subtitle + library — **các method nhận optional `scriptId`**
- `useVideoRender`: submit Creatomate + realtime jobs
- `useVideoCompletion`: orchestrator continuous với tier toggle, ETA động, overallProgress %
- `StoryboardVideoTab`: pick clips → reorder → audio → render
- `AudioStudioTab`: 3 tabs (voiceover/music/subtitle) + library w/ inline player + SRT download
- `VideoCompletionWizard`: 5-step UI (scenes/voice/bgm/subtitle/render) + tier toggle + Progress bar + ETA
