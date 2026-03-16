

## Ẩn/Khóa chỉnh sửa số chữ (Min/Max length) trong Brand Editor

### Vấn đề
Trong bước "Kênh" của form chỉnh sửa Brand, mỗi kênh social hiển thị ô nhập Min/Max số chữ (character length). User không muốn cho phép chỉnh sửa giá trị này — giữ nguyên default từ hệ thống.

### Giải pháp
Ẩn phần "Length Settings" (grid Min/Max) trong `ChannelSettingRow` — chỉ hiển thị giá trị default ở dạng text read-only trên header row (đã có sẵn ở line 498).

### File cần sửa

| File | Thay đổi |
|---|---|
| `src/components/ChannelSettingsEditor.tsx` | Xóa hoặc ẩn grid Min/Max length inputs (lines 506-552). Giữ hiển thị `{min}-{max} chữ/ký tự` ở header row như hiện tại. Xóa `max_length` và `min_length` khỏi logic `handleUpdateChannel` cleanup. |

### Chi tiết kỹ thuật
- Xóa block `{/* Length Settings */}` (lines 506-552) trong `ChannelSettingRow`
- Giữ nguyên display text ở line 498: `{currentMinLength}-{currentMaxLength} ký tự/chữ`
- Giữ nguyên `ChannelOverride` type definition (không breaking change) nhưng không render UI cho nó

