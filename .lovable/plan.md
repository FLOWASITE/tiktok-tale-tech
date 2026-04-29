
# Flowa Video Studio — Kế hoạch Full

## 1. Tóm tắt 4 quyết định của bạn

| # | Quyết định | Tác động |
|---|------------|----------|
| 1 | **Full scope** — làm cả 5 phase | Tổng ~6–7 ngày dev, có MVP usable sau Phase 1+2 (~2 ngày) |
| 2 | **Provider: GeminiGen Veo 3.1 Fast (default) + PoYo (Seedance 2 / Sora 2 / Happy Horse)** | Thêm 1 file `_shared/poyo-video-generator.ts`, mở rộng `VideoProvider` type |
| 3 | **Cả 9:16 và 16:9** | UI có aspect ratio picker; storyboard gen + image starting-frame phải tôn trọng ratio user chọn |
| 4 | **Cần voiceover + music + subtitle** | Thêm Phase 6 (Audio + Captions) — dùng ElevenLabs (TTS + Music + SFX) + Whisper transcribe |

## 2. Phát hiện nền móng (đã có sẵn — không phải làm lại)

- DB tables: `scripts`, `storyboards`, `video_generations` (0 records)
- Edge functions: `generate-script` (1934 dòng), `generate-storyboard` (335), `generate-video` (358 — đã wire GeminiGen)
- Shared: `_shared/geminigen-video-generator.ts` (đã hỗ trợ Veo 2/3/3.1/Sora 2)
- Components rời rạc: `VideoGeneratorPanel`, `StoryboardGenerator`, `VideoGallery` — nhúng trong `ScriptViewer`, **chưa có route riêng**
- Quota unit `video` đã có sẵn RPC `can_use_unit` + `_shared/quota-units.ts` — chỉ cần wire vào generate-video
- `ContentType = 'video_script'` đã có trong Agent system, nhưng `creatorStepsConfig` thiếu bước generate-video thực sự

## 3. Kiến trúc đề xuất

```text
┌──────────────────────────────────────────────────────────────┐
│  /videos  — Video Studio (route MỚI)                         │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ Tab 1: Quick Clip      → 1 prompt → 1 video 5–10s      │  │
│  │ Tab 2: From Storyboard → script → storyboard → multi   │  │
│  │ Tab 3: Audio Studio    → voiceover/music/subtitle mix  │  │
│  │ Tab 4: Gallery         → tất cả video của org          │  │
│  │ Tab 5: Costs           → tracking spend per provider   │  │
│  └────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────────┐
│  Edge Functions Layer                                         │
│  ├─ generate-video-prompt        (MỚI) text→prompt, brand+IM │
│  ├─ generate-video               (refactor — async + multi-provider) │
│  ├─ generate-video-batch         (MỚI) fan-out scenes        │
│  ├─ video-job-poller             (MỚI) pg_cron 30s           │
│  ├─ generate-voiceover           (MỚI) ElevenLabs TTS        │
│  ├─ generate-bgm                 (MỚI) ElevenLabs Music      │
│  ├─ transcribe-video-subtitles   (MỚI) Whisper → SRT/VTT     │
│  └─ assemble-final-video         (MỚI) ffmpeg mux video+audio+subs │
└──────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────────┐
│  Providers                                                    │
│  Video: GeminiGen Veo 3.1 Fast (default) | PoYo Seedance 2 / │
│         Sora 2 / Happy Horse (premium upsell)                 │
│  Audio: ElevenLabs (TTS + Music + SFX)                        │
│  Subtitle: Whisper (Lovable AI Gateway)                       │
└──────────────────────────────────────────────────────────────┘
```

---

## 4. Lộ trình 6 Phase

### **Phase 1 — Foundation & UX độc lập** (~1 ngày)
Cho video một "ngôi nhà" riêng, dễ tìm.

- Route `/videos` + page `VideoStudioPage.tsx` (5 tabs)
- Sidebar entry "Video Studio" (icon `Film`) trong `AppSidebar.tsx`
- Brand context selector ở đầu trang (pattern multichannel)
- Empty state đẹp: 3 example prompts theo brand industry
- **Tab Gallery**: list `video_generations` của org (đã có hook `useVideoGeneration`)
- **Tab Quick Clip**: form prompt + provider picker + aspect ratio (9:16/16:9/1:1) + duration + model

### **Phase 2 — Prompt Intelligence + Multi-Provider** (~1 ngày)
Video không còn raw prompt, có brand voice + compliance, support cả PoYo.

- Edge function mới `generate-video-prompt`:
  - Input: `{ topic, brand_template_id, industry_template_id, channel ('tiktok'|'reels'|'shorts'|'youtube'), aspect_ratio, mood, duration }`
  - Output: optimized video prompt + negative_prompt + suggested camera/lighting/action
  - Dùng `_shared/prompt-utils.ts → buildExtendedBrandPrompt`
  - Chạy `compliance-precheck` (block forbidden visual claims theo Industry Memory)
  - Cache theo `brand_template_id + topic_hash` (TTL 24h)
- **Auto-suggest 3 prompt variations**: Creative / Safe / Trendy
- **Tạo `_shared/poyo-video-generator.ts`**:
  - Hỗ trợ `poyo/seedance-2`, `poyo/sora-2`, `poyo/happy-horse`
  - Async submit + polling pattern (giống PoYo image)
  - Map `aspectRatio`, `duration`, `firstFrameUrl`, `lastFrameUrl` (Seedance hỗ trợ first/last frame)
- Mở rộng `VideoProvider = 'geminigen' | 'poyo' | 'lovable'` trong types, refactor `generate-video` route theo provider

### **Phase 3 — Async Job Pipeline + Realtime** (~1 ngày)
Veo/Sora/Seedance là async (60–180s) — UI không được block.

- Refactor `generate-video`: chỉ submit → return `job_id` ngay
- Migration: thêm cột vào `video_generations`:
  - `provider_job_id text` (task ID upstream)
  - `aspect_ratio_locked text` (lock ratio để batch consistency)
  - `parent_video_id uuid` (cho multi-scene)
  - `scene_count integer`
- Edge function mới `video-job-poller`: pg_cron mỗi 30s, scan `status='processing'`, poll provider, update DB + storage
- Frontend: realtime subscribe `video_generations` (đã enable realtime)
- Progress UI: percentage + ETA + cancel button
- Background persistence khi user disconnect (pattern memory đã có)

### **Phase 4 — Storyboard → Multi-scene Video** (~1.5 ngày)
Script 60s → 6 scenes × 10s, render song song, ghép lại. Hỗ trợ cả 9:16 (TikTok) và 16:9 (YouTube).

- Edge function `generate-video-batch`: input storyboard_id, fan-out generate-video cho từng scene
- **Continuity**: scene N dùng `last_frame` của scene N-1 làm `starting_frame_url` (Seedance/Veo đều hỗ trợ)
- Reuse pattern carousel sequential V2 (memory `carousel-sequential-v2-seamless`)
- **Storyboard generation phải nhận `aspect_ratio`**:
  - 9:16 → scenes ngắn 3–8s, dynamic vertical framing, hook trong 3s đầu
  - 16:9 → scenes 8–15s, cinematic landscape, intro–body–outro structure
- UI Storyboard tab:
  - Drag-reorder scenes
  - Regenerate single scene (không phải làm lại cả batch)
  - Timeline preview với progress per-scene
  - Aspect ratio picker ở header (9:16 ⇄ 16:9)
- **Stitching strategy** (chọn B sau spike):
  - **A.** Server-side ffmpeg trong edge function — RỦI RO timeout 150s
  - **B.** Client-side preview với `<video>` chained, server `assemble-final-video` chỉ chạy khi user "Export Final" → ffmpeg trong edge function với background task

### **Phase 5 — Cost Guardrail + Agent Integration** (~1 ngày)

- Wire unit `video` vào `quota-units.ts` (đã có RPC `can_use_unit`)
- Pre-flight cost estimate hiển thị trước Generate:
  - Veo 3.1 Fast: ~$0.10/giây
  - Sora 2 (PoYo): ~$0.30/giây
  - Seedance 2: ~$0.05/giây
  - Happy Horse: ~$0.04/giây
- Hard cap theo memory `pricing-tiers-official-2026-vn`:
  - Free 0/tháng · Starter 5 · Pro 50 · Enterprise 200
- Cập nhật `creatorStepsConfig.video_script`: thêm steps `storyboard_gen` + `video_gen` + `audio_mix`
- Agent creator pipeline `video_script` thật sự sinh video cuối (không chỉ text)
- Publish hook: video sẵn sàng → push vào TikTok/Reels/Shorts queue (reuse `publish-tiktok` pattern)

### **Phase 6 — Audio Studio: Voiceover + Music + Subtitle** (~1.5 ngày)

#### 6a. Voiceover (TTS)
- Edge function `generate-voiceover`:
  - Input: `{ script_text, voice_id, language ('vi'|'en'|'th'), speed, video_id }`
  - ElevenLabs TTS API (already have `ELEVENLABS_API_KEY` if connector — sẽ check)
  - Default voice mapping per language (VN: `Charlotte`/`Adam` Vietnamese-trained)
  - Output: lưu MP3 vào storage, attach `voiceover_url` vào `video_generations`
- UI: voice picker với preview button (sample 5s)

#### 6b. Background Music
- Edge function `generate-bgm`:
  - Input: `{ mood, genre, duration_seconds, video_id }` — mood inferred từ script tone
  - ElevenLabs Music API (`/v1/music`)
  - Output: lưu MP3, attach `bgm_url`
- Auto-suggest mood từ script: corporate/upbeat/emotional/cinematic
- Volume mix mặc định: voice 100%, BGM 25% (duck under voice)

#### 6c. Subtitle / Captions
- Edge function `transcribe-video-subtitles`:
  - Input: `voiceover_url` (hoặc `video_url` nếu Veo 3 đã có native audio)
  - Whisper qua Lovable AI Gateway (`openai/whisper-large-v3`) hoặc Deepgram
  - Output: SRT + VTT, lưu storage, attach `subtitles_srt_url`, `subtitles_vtt_url`
- Burn-in subtitle option (style: TikTok karaoke / YouTube caption)
- Editor inline: chỉnh timing + text trước khi burn-in

#### 6d. Final Assembly
- Edge function `assemble-final-video`:
  - ffmpeg in edge function (Deno binding hoặc spawn) — mix video + voiceover + BGM + burn-in subs
  - Background task pattern (return job_id ngay, polling)
  - Output: `final_video_url` — ready to publish

#### 6e. Migration DB
Thêm vào `video_generations`:
- `voiceover_url text`, `voice_id text`, `voice_language text`
- `bgm_url text`, `bgm_mood text`
- `subtitles_srt_url text`, `subtitles_vtt_url text`, `subtitles_burned_in boolean`
- `final_video_url text`, `assembly_status text`

---

## 5. Files dự kiến

### Tạo mới (~25 files)
**Frontend:**
- `src/pages/VideoStudioPage.tsx`
- `src/components/video/QuickClipTab.tsx`
- `src/components/video/StoryboardVideoTab.tsx`
- `src/components/video/AudioStudioTab.tsx`
- `src/components/video/VideoGalleryTab.tsx`
- `src/components/video/VideoCostTracker.tsx`
- `src/components/video/VideoPromptBuilder.tsx`
- `src/components/video/AspectRatioPicker.tsx`
- `src/components/video/ProviderModelPicker.tsx`
- `src/components/video/VoicePicker.tsx`
- `src/components/video/MoodPicker.tsx`
- `src/components/video/SubtitleEditor.tsx`
- `src/hooks/useVideoPromptBuilder.ts`
- `src/hooks/useVoiceover.ts`
- `src/hooks/useBGM.ts`
- `src/hooks/useSubtitles.ts`

**Backend:**
- `supabase/functions/generate-video-prompt/index.ts`
- `supabase/functions/generate-video-batch/index.ts`
- `supabase/functions/video-job-poller/index.ts`
- `supabase/functions/generate-voiceover/index.ts`
- `supabase/functions/generate-bgm/index.ts`
- `supabase/functions/transcribe-video-subtitles/index.ts`
- `supabase/functions/assemble-final-video/index.ts`
- `supabase/functions/_shared/poyo-video-generator.ts`

**Migrations:**
- Migration thêm cột vào `video_generations` (provider_job_id, parent_video_id, audio fields…)
- Migration: pg_cron job `video-job-poller` (mỗi 30s) — dùng insert tool vì có URL/anon key
- Migration: storage bucket `videos`, `voiceovers`, `bgm`, `subtitles` với RLS theo `organization_id`

### Sửa đổi
- `src/app/routes.tsx` (route `/videos`)
- `src/components/AppSidebar.tsx` (entry sidebar)
- `src/components/QuickActionGrid.tsx` (action "Tạo Video")
- `src/components/QuickSearch.tsx` (search "video")
- `supabase/functions/generate-video/index.ts` (multi-provider + async)
- `supabase/functions/generate-storyboard/index.ts` (nhận aspect_ratio)
- `supabase/functions/_shared/quota-units.ts` (đảm bảo wire `video` unit)
- `src/components/agents/creatorStepsConfig.ts` (thêm storyboard_gen, video_gen, audio_mix)
- `src/types/videoGeneration.ts` (thêm fields audio + provider PoYo)
- `src/types/agent.ts` (creator agent video_script flow)

---

## 6. Quyết định kỹ thuật mặc định (sẽ apply nếu không phản đối)

1. **Default model**: GeminiGen Veo 3.1 Fast (rẻ + có audio native cho 9:16) → fallback PoYo Seedance 2 nếu hết credit
2. **Aspect default**: 9:16 (TikTok use case ưu tiên), nhưng UI luôn show toggle 9:16/16:9/1:1
3. **Voice TTS**: ElevenLabs `eleven_multilingual_v2`, default voice "Charlotte" cho VN
4. **Music**: ElevenLabs Music API, default duration = video duration, fade in/out 1s
5. **Subtitle**: Whisper qua Lovable Gateway (rẻ + có sẵn key), default style "TikTok karaoke" (white text + black stroke + word-by-word highlight)
6. **Stitching**: Client-side preview, server-side assemble ffmpeg chỉ chạy khi user "Export Final"
7. **Storage**: Lovable Cloud storage buckets riêng cho video / voiceover / bgm / subtitle, RLS theo `organization_id`

## 7. Cần secrets

- ✅ `GEMINIGEN_API_KEY` — đã có
- ✅ `POYO_API_KEY` — đã có
- ⚠️ `ELEVENLABS_API_KEY` — sẽ check `fetch_secrets` ở bước build; nếu chưa có sẽ dùng `add_secret` tool và pause Phase 6 cho user nhập

## 8. Thứ tự build & deliverable

| Tuần | Phase | Deliverable cho user |
|------|-------|----------------------|
| Ngày 1 | Phase 1 | Route `/videos` + Gallery + Quick Clip cơ bản chạy được Veo |
| Ngày 2 | Phase 2 | PoYo provider + smart prompt + brand context |
| Ngày 3 | Phase 3 | Async job + realtime progress + cancel |
| Ngày 4–5 | Phase 4 | Storyboard multi-scene 9:16 + 16:9 + drag-reorder |
| Ngày 6 | Phase 5 | Quota guardrail + Agent pipeline video_script |
| Ngày 7 | Phase 6 | Voiceover + Music + Subtitle + Final assemble |

Sau Phase 1+2 đã có MVP usable; bạn có thể test ngay Quick Clip với GeminiGen + PoYo. Các phase sau bồi đắp dần, không block dùng sản phẩm.

---

**Bấm Approve để mình bắt đầu Phase 1 ngay.** Mình sẽ commit từng phase độc lập để bạn thấy tiến độ và có thể test sớm.
