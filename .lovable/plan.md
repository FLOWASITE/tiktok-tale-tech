

# Sửa hiển thị "Chưa rõ" trên ScriptCard

## Nguyên nhân

22/55 scripts trong database có `user_id = NULL` → `CreatorCell` nhận `profile = undefined` → hiển thị "Chưa rõ" (italic, khó hiểu).

## Giải pháp: 2 bước

### A. Sửa UI — thay "Chưa rõ" thành text rõ nghĩa hơn
- **`src/components/CreatorCell.tsx`**: Khi `!profile`, hiển thị "Tôi" (nếu script thuộc current user) hoặc ẩn luôn CreatorCell thay vì hiện chữ mơ hồ.
- **`src/components/ScriptCard.tsx`**: Nếu không có `creatorProfile` và không loading, ẩn CreatorCell + dấu chấm phân cách, chỉ hiện timestamp.

### B. Backfill data — gán user_id cho scripts cũ
- Chạy migration SQL: UPDATE scripts SET `user_id` = (user hiện tại) WHERE `user_id IS NULL` — vì theo data, chỉ có 1 user (`c618b2dc...`) trong hệ thống, nên các script NULL rất có thể là của user đó.

## Files thay đổi

| File | Thay đổi |
|------|----------|
| `src/components/ScriptCard.tsx` | Ẩn CreatorCell khi không có profile |
| `src/components/CreatorCell.tsx` | Fallback text rõ nghĩa hơn |
| Migration SQL | Backfill `user_id` cho 22 scripts thiếu |

