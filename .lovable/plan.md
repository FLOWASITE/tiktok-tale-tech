## Vấn đề

Thiếu nhiều ngày lễ quan trọng của Việt Nam:
- **Code** (`SEASONAL_EVENTS` trong `topicDiscovery.ts`): Không có Giỗ Tổ Hùng Vương, 30/4, 1/5, Halloween, Singles Day 11/11, Tất Niên
- **Database** (`curated_events`): Không có dữ liệu H1 2026 (Tết 2026, Valentine, 8/3, Giỗ Tổ Hùng Vương 2026, 30/4/2026, 1/5/2026)

## Thay đổi

### 1. Bổ sung `SEASONAL_EVENTS` trong `src/types/topicDiscovery.ts`

Thêm các event còn thiếu vào array, sử dụng `nextOccurrence()` đã có:

| ID | Tên | Tháng/Ngày |
|----|-----|-----------|
| hung-kings | Giỗ Tổ Hùng Vương | ~4/16 (approximate lunar) |
| liberation-day | Giải phóng miền Nam 30/4 | 4/30 |
| labor-day | Quốc tế Lao động 1/5 | 5/1 |
| halloween | Halloween | 10/31 |
| singles-day | Singles Day 11/11 | 11/11 |
| year-end | Tất Niên | 12/31 |

Mỗi event có 3 `suggestedTopics` phù hợp ngành marketing.

### 2. Insert dữ liệu H1 2026 vào `curated_events`

Dùng Supabase insert tool để thêm các ngày lễ H1 2026 đã qua nhưng cần có cho đầy đủ, và các ngày sắp tới:

- Tết Nguyên Đán 2026 (17/02/2026)
- Valentine 2026 (14/02/2026)  
- Quốc tế Phụ nữ 8/3/2026
- Giỗ Tổ Hùng Vương 2026 (16/04/2026)
- Giải phóng miền Nam 30/4/2026
- Quốc tế Lao động 1/5/2026

Các event bao gồm `suggested_topics`, `suggested_angles`, `event_type`, `priority`.

### Không thay đổi

- Logic `nextOccurrence()` và `getUpcomingEvents()` giữ nguyên
- Không ảnh hưởng UI components
