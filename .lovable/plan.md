

# Tối ưu giới hạn ký tự X (Twitter) trong luồng đăng bài

## Hiện trạng

- Frontend: Textarea cho sửa nội dung tự do, chỉ hiện warning khi vượt 280 ký tự nhưng vẫn cho đăng
- Backend (`publish-twitter` dòng 319): Cắt cứng nội dung xuống 277 ký tự + "..." nếu vượt 280 → user mất nội dung mà không biết trước
- Không có hỗ trợ rút gọn tự động hoặc gợi ý

## Giải pháp

### 1. `src/components/social/DirectPublishButton.tsx` — Enforce giới hạn trên UI

- **Textarea maxLength**: Thêm `maxLength={280}` cho textarea khi platform là Twitter → không cho nhập quá
- **Char counter luôn hiển thị**: Hiện counter `{length}/280` dạng nổi bật hơn, đổi màu theo ngưỡng:
  - Xanh: < 250
  - Vàng: 250-270
  - Đỏ: 271-280
- **Disable nút Đăng** khi `editableContent.length > 280` (thay vì chỉ warning)
- **Nút "Rút gọn"**: Khi nội dung > 280, hiện nút giúp cắt thông minh (cắt ở ranh giới câu/từ gần nhất thay vì cắt giữa từ + "...")

### 2. `supabase/functions/publish-twitter/index.ts` — Backend validation tốt hơn

- Thay vì cắt cứng `content.substring(0, 277) + '...'`, **reject** nếu > 280 với error message rõ ràng: "Nội dung vượt quá 280 ký tự. Vui lòng rút gọn trước khi đăng."
- Giữ nguyên truncation chỉ như safety net (fallback) nếu frontend lỡ gửi quá

## Files thay đổi

| File | Thay đổi |
|------|----------|
| `src/components/social/DirectPublishButton.tsx` | Enforce maxLength, char counter cải tiến, nút rút gọn, disable đăng khi vượt |
| `supabase/functions/publish-twitter/index.ts` | Reject nếu > 280 thay vì cắt âm thầm |

