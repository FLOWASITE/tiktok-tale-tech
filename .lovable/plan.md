

## Trả lời: KHÔNG hạn chế phong cách/loại ảnh khác

Hệ thống hiện tại có **2 mode rõ ràng**:

| Mode | Khi nào dùng | Thay đổi đề xuất |
|------|-------------|------------------|
| `background_only` | Ảnh nền thuần, không text | **Không thay đổi gì** |
| `with_text` | Social graphic có chữ trên ảnh | **Chỉ thêm layout structure ở mode này** |

### Tại sao không hạn chế?

1. **Layout structure chỉ inject vào mode `with_text`** — code hiện tại đã có điều kiện `if (isWithText)` (dòng 787). Khi user chọn `background_only`, toàn bộ phần tiêu đề/contact/CTA sẽ không xuất hiện trong prompt.

2. **12 phong cách ảnh vẫn giữ nguyên** — `imageStylePreset` (photorealistic, illustration, minimalist, cinematic, v.v.) được inject riêng qua `buildStylePresetSection()` (dòng 784), **độc lập** với layout structure. User vẫn chọn bất kỳ style nào.

3. **Channel-specific visual directions vẫn hoạt động** — Mỗi kênh có `CHANNEL_IMAGE_SPECS` riêng (mood, composition, avoidElements) và không bị ghi đè bởi layout mới.

4. **Content Role / Content Angle vẫn ảnh hưởng visual** — Seed/Sprout/Harvest và Educational/Storytelling/Promotional vẫn được inject bình thường.

### Tóm lại

Thay đổi đề xuất **chỉ bổ sung thêm hướng dẫn bố cục** cho mode `with_text`, không xóa bỏ hay thay thế bất kỳ logic nào hiện có. Tất cả 12 phong cách, tất cả channel specs, tất cả content role/angle đều giữ nguyên 100%.

Nếu bạn đồng ý, tôi sẽ tiến hành implement theo kế hoạch đã trình bày trước đó.

