---
name: Video Audio & Stitching Pipeline
description: ElevenLabs TTS/Music/STT + Creatomate stitching cho Video Studio Phase 4-6
type: feature
---

# Video Studio Phase 4-6 Architecture

## Audio Studio (ElevenLabs)
- **Voiceover**: `generate-voiceover` → ElevenLabs TTS `eleven_multilingual_v2`, default voice Sarah (EXAVITQu4vr4xnSDxMaL), upload to `audio-assets` public bucket, persist trong `audio_assets` table
- **BGM**: `generate-bgm` → ElevenLabs Music API (`/v1/music`), prompt MUST be `prompt` not `text`, duration 5-30s
- **Subtitles**: `generate-subtitles` → ElevenLabs `scribe_v2` STT, output cả SRT + VTT (chunk ~7 từ hoặc 3s)

## Stitching (Creatomate)
- **Submit**: `render-video-creatomate` → Creatomate `/v1/renders` với JSON source: video clips track 1 (sequential), voiceover track 2 vol=1.0, BGM track 3 ducked vol=0.2 loop=true, subtitles track 4 với `text_transcript_source` field cho burn-in
- **Poll**: `render-job-poller` chạy cron 30s, max 60 attempts (30 min timeout)
- **Aspect dims**: 9:16=1080x1920, 16:9=1920x1080, 1:1=1080x1080, frame_rate=30

## Tables
- `video_render_jobs`: storyboard_id, source_clip_ids[], voiceover_url, bgm_url, subtitle_srt, burn_subtitles, aspect_ratio, output_url, provider_render_id, status, progress, poll_attempts. Realtime enabled.
- `audio_assets`: asset_type (voiceover/music/sfx/subtitle), source_text/prompt, voice_id, duration_seconds, audio_url, srt_content, vtt_content, cost_estimate

## Storage Buckets
- `audio-assets` (public): user_id/voiceover-{ts}.mp3, user_id/bgm-{ts}.mp3
- `video-renders` (public): final stitched videos

## Frontend
- `useAudioStudio`: gen voiceover/BGM/subtitle + library
- `useVideoRender`: submit Creatomate + realtime jobs
- `StoryboardVideoTab`: pick clips → reorder → audio → render
- `AudioStudioTab`: 3 tabs (voiceover/music/subtitle) + library w/ inline player + SRT download
