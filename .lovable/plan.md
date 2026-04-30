Bạn đúng — nếu model là Kling và provider thật sự hỗ trợ clip 15s, thì TikTok 15s có thể render bằng 1 prompt/1 clip. Lý do hiện hệ thống vẫn tính nhiều prompt là vì code hiện tại chưa đưa Kling 15s vào auto-pick, mà đang ưu tiên Seedance/Veo với cap 8-12s và còn tách hook riêng.

Kế hoạch sửa:

1. Cập nhật model capability cho Kling
- Bổ sung/cập nhật cap Kling trong các registry video hiện có:
  - `src/lib/videoModelCaps.ts`
  - `src/types/videoGeneration.ts`
  - `src/components/video/ProviderModelPicker.tsx` nếu picker cần hiển thị đúng max duration
  - `supabase/functions/_shared/poyo-video-generator.ts` nếu backend render hiện chưa chấp nhận model Kling
- Mục tiêu: Kling có `maxDuration: 15` và duration choices phù hợp với API thực tế.

2. Sửa auto-pick trong `generate-script`
- Với video short vertical như TikTok/Reels/Shorts 15s:
  - nếu duration `<= 15s` và aspect `9:16`, chọn Kling thay vì Seedance/Veo
  - `maxClipSec = 15`
  - `recommendedScenes = 1`
- Với video dài hơn 15s:
  - chia theo cap 15s: 30s = 2 prompt, 45s = 3 prompt, 60s = 4 prompt

3. Bỏ ép tối thiểu 2 scene khi duration nằm trong cap
- Hiện `computeSmartSceneCount` đang ép tối thiểu 2 scene:
  ```ts
  return Math.min(pacing.maxScenes, Math.max(2, total));
  ```
- Sửa thành logic:
  ```ts
  if (duration <= sceneDurationCapSec) return 1;
  ```
- Sau đó mới áp dụng chia clip cho video vượt cap.

4. Điều chỉnh scene duration plan cho 1 prompt
- Khi `sceneCount === 1`, plan sẽ là:
  ```text
  [15]
  ```
- Prompt output sẽ là:
  ```text
  PROMPT 1 [00:00-00:15]
  ```
- Không tách hook thành clip riêng; hook sẽ nằm trong 2-3 giây đầu của cùng prompt.

5. Cập nhật prompt instruction
- Thêm rule cho single-clip 15s:
  - hook diễn ra trong 0-3s đầu
  - không tạo cut/transition nội bộ
  - mô tả continuous action + camera movement 1 hướng để 15s không bị tĩnh

Kết quả mong muốn:

```text
TikTok 15s 9:16
  ↓
pickRecommendedVideoModel → Kling 15s cap
  ↓
computeSmartSceneCount → 1 prompt
  ↓
buildSceneDurationPlan → [15s]
  ↓
AI viết 1 visual prompt continuous-motion
  ↓
Render 1 clip Kling 15s
```

Bảng sau khi sửa:

| Duration | Model đề xuất | Prompt/clip |
|---|---:|---:|
| TikTok 10s | Kling/Seedance tùy cost | 1 |
| TikTok 15s | Kling 15s | 1 |
| TikTok 30s | Kling 15s | 2 |
| TikTok 45s | Kling 15s | 3 |
| TikTok 60s | Kling 15s | 4 |

Điểm cần lưu ý: Kling 15s tiết kiệm prompt nhất, nhưng nếu chi phí/chất lượng của Kling cao hơn Seedance thì có thể thêm rule: `Min Credit` chọn Kling 15s, còn `Fast/Cheap` vẫn chọn Seedance.