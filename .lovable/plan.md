

# Phân tích: qualityMode có cần thiết không?

## Kết luận: Backend CẦN, nhưng UI selector KHÔNG CẦN

### qualityMode ở Backend (GIỮ NGUYÊN)
`qualityMode` được sử dụng sâu trong hệ thống:
- **channel-optimization.ts**: Mỗi kênh có qualityMode mặc định (Twitter → fast, Website → quality, Facebook → balanced)
- **generate-multichannel**: Dùng qualityMode để quyết định skip/include critique step, chọn AI model
- **Brand channel optimization**: Admin có thể override qualityMode per channel per brand
- **ai_channel_model_configs** table: Lưu `quality_mode_default` per channel
- **Edge function metrics**: Log qualityMode để analytics

→ Đây là config nội bộ quan trọng, **KHÔNG bỏ**.

### QualityModeQuickSelector UI (BỎ)
Component `QualityModeQuickSelector.tsx` **không được import ở bất kỳ đâu** — hoàn toàn là dead code. Hệ thống đã tự động chọn qualityMode dựa trên:
1. Channel defaults (Twitter=fast, Website=quality...)
2. Brand-level overrides (admin config)
3. Không cần user chọn thủ công

## Kế hoạch

| File | Thay đổi |
|------|----------|
| `src/components/multichannel/QualityModeQuickSelector.tsx` | **Xóa file** — dead code, không import ở đâu |

Chỉ xóa 1 file UI. Không ảnh hưởng backend hay bất kỳ tính năng nào.

