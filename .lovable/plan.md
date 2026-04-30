## Mục tiêu
Hiện tại `PLATFORM_SPEC_BY_ID` đang **hardcode `sceneDurationSec` = 5-6s** cho mọi platform → giả định model là Seedance. Với video dài (60-180s), điều này tạo quá nhiều clip không cần thiết.

Giải pháp: thêm tầng **"Recommended Video Model"** chọn model có `maxDuration` cao nhất theo platform → kéo `sceneDurationSec` lên **8-10s khi phù hợp** → giảm 30-50% số clip cần render.

## Nguyên tắc auto-pick (cân bằng theo platform)

| Platform | Aspect | Recommended model | maxDuration | Lý do |
|---|---|---|---|---|
| TikTok / Reels / Shorts (vertical short ≤60s) | 9:16 | `poyo/n-2` (Seedance 2) | 5-6s | Short-form fast cuts cần pacing nhanh, Seedance đủ chất + rẻ |
| Reels / TikTok long (>60s) | 9:16 | `geminigen/n-3-fast` (Veo 3 Fast) | **10s** | Long-form vertical cần ít clip hơn để giữ flow |
| Pinterest 2:3 | 2:3 | `geminigen/n-3-fast` | **10s** | Lifestyle pacing chậm, scene dài |
| Square 1:1 (FB/IG feed) | 1:1 | `poyo/n-2` | 6s | Feed video ngắn |
| Horizontal 16:9 (YouTube long, LinkedIn) | 16:9 | `geminigen/n-3.1-fast` (Veo 3.1 Fast) | **10s** | Long storytelling, ít clip = mượt hơn |
| YouTube Shorts | 9:16 | `poyo/n-2` | 6s | Như TikTok short |

## Thay đổi code

### 1. `supabase/functions/generate-script/index.ts`

**Thêm helper `pickRecommendedVideoModel`:**
```ts
interface VideoModelRecommendation {
  modelId: string;        // 'poyo/n-2' | 'geminigen/n-3-fast' | 'geminigen/n-3.1-fast'
  modelLabel: string;     // 'Seedance 2' | 'Veo 3 Fast' | 'Veo 3.1 Fast'
  maxClipSec: number;     // 6 | 10
  reason: string;         // log + return cho client
}

function pickRecommendedVideoModel(
  platformLabel: string, aspect: string, totalDuration: number
): VideoModelRecommendation
```

Logic:
- `aspect === '9:16' && totalDuration <= 60` → Seedance 2 (cap 6s)
- `aspect === '9:16' && totalDuration > 60` → Veo 3 Fast (cap 10s)
- `aspect === '16:9'` → Veo 3.1 Fast (cap 10s)
- `aspect === '2:3'` (Pinterest) → Veo 3 Fast (cap 10s)
- `aspect === '1:1'` → Seedance 2 (cap 6s)
- Default → Seedance 2

**Update `getPlatformSpec`:** chạy `pickRecommendedVideoModel` trước → **override `base.sceneDurationSec` = `recommendation.maxClipSec`** trước khi gọi `computeSmartSceneCount` + `buildSceneDurationPlan`. Như vậy số scene tự động giảm.

**Mở rộng `PlatformSpec`:** thêm 3 field
```ts
recommendedVideoModel: string;       // modelId
recommendedVideoModelLabel: string;  // human label
videoModelReason: string;            // lý do pick
```

**Inject vào AI prompt + response:**
- Inject vào system prompt: `"Mỗi PROMPT sẽ được render bằng {modelLabel} (cap {maxClipSec}s/clip)."` để AI viết prompt phù hợp với khả năng của model.
- Trả về `metadata.recommendedVideoModel` trong response JSON cho client hiển thị.

### 2. Frontend: hiển thị model recommendation

`src/hooks/useVideoCompletion.ts` đã có map `fast` (Seedance) / `hero` (Veo 3 Fast). Cần:
- Component nào hiển thị scene plan từ `generate-script` (Studio/Storyboard) → đọc `metadata.recommendedVideoModel` → **auto pre-select** preset trong QuickClip menu (fast vs hero).
- Hiển thị badge nhỏ `"Đề xuất: Veo 3 Fast — giảm còn N clip"` để user hiểu lý do.

(Sẽ tìm component cụ thể khi implement; ước tính 1-2 file UI.)

## Tác động

Ví dụ video TikTok long 90s:
- **Trước:** cap 6s → ~15 clip (15 lần gọi Seedance)
- **Sau:** cap 10s (Veo 3 Fast) → ~9 clip (giảm 40%)

Video YouTube 16:9 dài 120s:
- **Trước:** cap 6s → ~20 clip
- **Sau:** cap 10s → ~12 clip (giảm 40%)

## Files thay đổi
- `supabase/functions/generate-script/index.ts` (thêm `pickRecommendedVideoModel`, sửa `getPlatformSpec`, mở rộng interface, inject prompt + response metadata)
- 1-2 file frontend hiển thị scene plan (sẽ xác định khi implement) — auto pre-select preset model + badge gợi ý

## Không thay đổi
- Không động `_shared/geminigen-video-generator.ts` (model registry giữ nguyên)
- Không động pricing/quota logic
- User vẫn có quyền override model cuối cùng tại QuickClip — đây chỉ là **smart default**
