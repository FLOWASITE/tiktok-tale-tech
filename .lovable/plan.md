Xin lỗi, mình đã hiểu sai phạm vi.

Kế hoạch sửa đúng yêu cầu:

1. Chỉ chỉnh phần UI card Shopify ở `/admin/social-settings`
   - Cho Shopify dùng cùng nhánh button như Blogger.
   - Kết quả:
     - Chưa cấu hình: hiện nút `Cấu hình`
     - Đã cấu hình: hiện `Chỉnh sửa` + icon test + icon xóa

2. Không làm thêm phần ngoài phạm vi
   - Không đổi flow Brand Shopify connect.
   - Không sửa OAuth Shopify.
   - Không đổi edge functions Shopify.
   - Không đụng Shopify connector/integration của Lovable.

3. Nếu cần để nút `Cấu hình/Chỉnh sửa` mở đúng form giống Blogger
   - Bỏ Shopify khỏi danh sách read-only trong dialog cấu hình admin.
   - Thêm label field Shopify Client ID / Shopify Client Secret để form không bị read-only.

Files dự kiến chỉnh:
- `src/pages/AdminSocialSettings.tsx`
- `src/components/admin/SocialPlatformCredentialsDialog.tsx`