

# Tối ưu UI Đăng lên Zalo OA

## Vấn đề hiện tại
1. **Icon sai** — Dialog dùng emoji `💬` cho Zalo thay vì `ZaloIcon` SVG chuẩn
2. **Không có UI cho ảnh bìa** — Zalo OA bắt buộc ảnh bìa nhưng dialog không có phần chọn/hiển thị ảnh bìa rõ ràng, user không biết tại sao bị lỗi
3. **Không tách title/description** — Zalo article cần title riêng (max 100 ký tự) và description (max 200 ký tự), hiện tại tự trích từ content, user không kiểm soát được
4. **Thiếu cảnh báo yêu cầu** — Không hiển thị rõ các yêu cầu đặc biệt của Zalo OA

## Thay đổi

### File: `src/components/social/DirectPublishButton.tsx`

**1. Sửa icon Zalo:**
- Import `ZaloIcon` từ `@/components/icons/SocialIcons`
- Thay `zalo_oa: () => <span>💬</span>` bằng `zalo_oa: ZaloIcon`

**2. Thêm fields riêng cho Zalo OA trong confirm dialog:**
- Input **Tiêu đề bài viết** (max 100 ký tự) — tự trích dòng đầu, cho phép sửa
- Input **Mô tả ngắn** (max 200 ký tự) — tự trích 2 dòng đầu, cho phép sửa
- Phần **Ảnh bìa** nổi bật:
  - Nếu có `mediaUrls[0]` → hiển thị preview ảnh bìa với badge "Ảnh bìa"
  - Nếu không có → hiển thị warning box: "⚠️ Zalo OA yêu cầu ảnh bìa. Vui lòng thêm ảnh vào nội dung trước khi đăng."
  - Disable nút "Đăng ngay" khi không có ảnh bìa

**3. Truyền title/description vào publishOptions:**
- Thêm `articleData: { title, description, coverUrl }` vào `PublishOptions` khi platform là `zalo_oa`

### File: `src/hooks/useDirectPublish.ts`

- Cập nhật `PublishOptions` interface thêm optional `articleData` field

## Tóm tắt files

| File | Thay đổi |
|------|----------|
| `src/components/social/DirectPublishButton.tsx` | Icon ZaloIcon, thêm fields title/description/cover cho Zalo, disable publish khi thiếu ảnh |
| `src/hooks/useDirectPublish.ts` | Thêm `articleData` vào `PublishOptions` |

