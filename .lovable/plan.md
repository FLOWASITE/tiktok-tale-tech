# Implementation: 1 prompt cho video ngắn (TikTok 15s)

## Đã sửa

### `supabase/functions/generate-script/index.ts`

1. **`computeSmartSceneCount`**: bỏ tách hook scene riêng. Logic mới:
   - `duration ≤ cap` → **1 prompt**
   - `duration > cap` → `ceil(duration / cap)` prompt

2. **`buildSceneDurationPlan`**: bỏ ưu tiên `pacing.hookSceneSec`, chia đều theo sceneCount.

3. **`pickRecommendedVideoModel`**: nâng cap Seedance 2 từ 8/12s → **15s** (theo doc PoYo 4-15s).
   - Mọi vertical/square: Seedance 2 cap 15s
   - 16:9: Veo 3.1 Fast cap 8s (doc fixed)

4. **Prompt `[AI RENDER MODEL]`**: thêm rule "PROMPT 1 phải có visual hook trong 0-3s đầu" (vì hook không còn là clip riêng).

## Bảng kết quả

| Duration | Aspect | Trước | Sau | Giảm |
|---|---|---:|---:|---:|
| TikTok 10s | 9:16 | 2 (hook+1) | **1** | -50% |
| TikTok 15s | 9:16 | 3 (hook+2) | **1** | **-67%** |
| TikTok 30s | 9:16 | 5 | **2** | -60% |
| Reels 45s | 9:16 | 7 | **3** | -57% |
| Reels 60s | 9:16 | 9 | **4** | -56% |
| YT Shorts 90s | 9:16 | 9 | **6** | -33% |
| 16:9 60s | 16:9 | 8 | **8** | 0% (Veo cap 8s) |

## Lưu ý

- **Không phải Kling**: Kling 2.6 PoYo cap 10s. **Seedance 2** mới là model PoYo support 4-15s/clip.
- Nếu muốn Kling thay thế cho character animation → tạo branch riêng theo aspect (vd: 9:16 + character → Kling 10s).
