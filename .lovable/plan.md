Icon Zalo OA hiện tại là wordmark "Zalo" hơi khó nhận diện và không match style brand chuẩn (logo Zalo chính thức là khung bo tròn màu xanh #0068FF với chữ "Zalo" trắng). Mình sẽ thay bằng phiên bản đúng.

Thay đổi:

1. Cập nhật `ZaloIcon` trong `src/components/icons/SocialIcons.tsx`
- Đổi viewBox 24x24 → 48x48
- Vẽ rounded square nền `#0068FF` (màu brand Zalo chính thức)
- Wordmark "Zalo" trắng bên trong, đúng tỉ lệ logo gốc
- Bỏ `fill="currentColor"` ở root để giữ màu brand cố định

2. Không đụng các file khác
- Tất cả màn hình đang import `ZaloIcon` từ `SocialIcons.tsx` sẽ tự cập nhật: form Nội dung đa kênh (Wizard/Stepper/Form), Account, BrandViewConnectionsTab, SocialConnectionsManager…

3. Kiểm tra
- Xem lại bước "Kênh xuất bản" để confirm icon Zalo OA hiển thị đúng khung xanh + chữ "Zalo" trắng.