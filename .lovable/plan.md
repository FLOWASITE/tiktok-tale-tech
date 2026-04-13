

## Giải thích vấn đề

Fanpage "Flowa – Auto AI Content. All Socials" hiển thị ở brand "Thuế Hộ" vì **đây là kết nối cũ** (từ 18/03) được tạo trước khi hệ thống hỗ trợ multi-fanpage. Kết nối này đã bị ngắt (`is_active = false`) nhưng vẫn còn trong database gắn với brand "Thuế Hộ".

- Brand "Flowa" có kết nối **active** đến Fanpage này (mới, 13/04)
- Brand "Thuế Hộ" có kết nối **inactive** (cũ, 18/03) — đây là dữ liệu dư thừa

**Giải pháp nhanh:** Bấm icon thùng rác (🗑️) bên cạnh kết nối "Flowa – Auto AI Content" ở brand Thuế Hộ để xóa nó.

### Cải thiện code để tránh nhầm lẫn

**1. `src/components/brand/BrandViewConnectionsTab.tsx`**
- Trong `renderFacebookPlatform()`: tách rõ danh sách Active và Inactive
- Connections inactive hiển thị mờ hơn, với label rõ ràng "Đã ngắt" và nút xóa nổi bật
- Ẩn connections inactive theo mặc định, chỉ hiện khi user bấm "Hiện kết nối đã ngắt"

**2. Không cần thay đổi backend** — logic đã đúng, đây là dữ liệu cũ từ trước khi fix.

