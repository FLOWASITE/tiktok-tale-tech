---
name: Smart Video Model Pick
description: generate-script auto-pick model + tính sceneCount tối thiểu để giảm số clip render
type: feature
---

# Smart Video Model Pick (generate-script)

## Logic chọn model (`pickRecommendedVideoModel`)

| Aspect | Model | Cap/clip | Lý do |
|---|---|---:|---|
| 9:16 / 2:3 / 1:1 / khác | `poyo/seedance-2` | **10s** | PoYo API chỉ accept 5 hoặc 10 |
| 16:9 | `geminigen/veo-3.1-fast` | 8s | Doc Veo 3.1 fixed 8s |

## Logic tính số prompt (`computeSmartSceneCount`)

```ts
if (duration <= cap) return 1;
return Math.ceil(duration / cap);
```

- **Bỏ tách hook scene riêng** — hook nằm trong 0-3s đầu của PROMPT 1 (rule trong `[AI RENDER MODEL]`).
- TikTok 15s 9:16 → **2 prompts** (Seedance max 10s/clip).
- 30s → 3, 60s → 6 prompts.

## Prompt rule cho clip dài (`[AI RENDER MODEL]`)

- 1 cảnh duy nhất, không cut/transition trong 1 prompt.
- Subject action + camera move 1 hướng liên tục suốt cap (tránh tĩnh khi clip ≥10s).
- PROMPT 1: visual hook (close-up, motion blur, gesture) trong 0-3s đầu.
- Pacing kiểm soát bởi voiceover/subtitle, không bằng số clip.

## Lưu ý

- **PoYo API duration**: Dù docs ghi 4-15s, API thực tế chỉ accept `5` hoặc `10`. Gửi 15 → fail "no task_id".
- Backend `poyo-video-generator.ts` clamp duration >10 → 10 tự động (safety net).
