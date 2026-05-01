---
name: Smart Video Model Pick
description: generate-script auto-pick model + content density WPM constraints để video truyền tải đủ nội dung
type: feature
---

# Smart Video Model Pick (generate-script)

## Logic chọn model (`pickRecommendedVideoModel`)

| Aspect | Model | Cap/clip | Lý do |
|---|---|---:|---|
| 9:16 / 2:3 / 1:1 / khác | `poyo/seedance-2` | **10s** | Practical cap — API accepts 4-15 but 10s is sweet spot |
| 16:9 | `geminigen/veo-3.1-fast` | 8s | Doc Veo 3.1 fixed 8s |

## PoYo API Duration Constraints

- **Validation**: `duration must be between 4 and 15` (confirmed from API error)
- **Backend clamp**: `poyo-video-generator.ts` → `Math.max(4, Math.min(10, rawDuration))`
- Scene durations from scripts can be <4s (e.g. hook scenes 3s) → must clamp up to 4s minimum

## Logic tính số prompt (`computeSmartSceneCount`)

```ts
if (duration <= cap) return 1;
return Math.ceil(duration / cap);
```

- **Bỏ tách hook scene riêng** — hook nằm trong 0-3s đầu của PROMPT 1.
- TikTok 15s 9:16 → **2 prompts** (Seedance max 10s/clip).

## Content Density Rules (WPM)

- Tốc độ nói tiếng Việt tự nhiên: **~2.5 từ/giây** (150 WPM)
- `WORDS_PER_SEC = 2.5` constant trong generate-script
- `getWordBudget(sec)` = `Math.round(sec * 2.5)`
- `getMaxSentences(sec)`: ≤3s→1 câu, 4-5s→2 câu, 6-8s→3 câu, 9-10s→4 câu
- Scene plan format hiển thị word budget: `PROMPT 1: 2s (~5 từ)`
- System prompt có section `CONTENT DENSITY — BẮT BUỘC` với word budget per scene
- Output format DIALOGUE header: `[DIALOGUE - max ~Y từ cho Xs scene]`
- Self-check checklist có mục kiểm tra content density

## Prompt rule cho clip dài (`[AI RENDER MODEL]`)

- 1 cảnh duy nhất, không cut/transition trong 1 prompt.
- Subject action + camera move 1 hướng liên tục suốt cap.
- PROMPT 1: visual hook (close-up, motion blur, gesture) trong 0-3s đầu.
