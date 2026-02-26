

# Hoàn thiện UI: 3 vấn đề còn lại

## 1. BrandContextCard gây console error (ref warning)

**Lỗi hiện tại:** Console liên tục báo "Function components cannot be given refs" cho BrandContextCard bên trong PersonalizedWelcome. Framer Motion's AnimatePresence cần ref trên children để thực hiện exit animations.

**Fix:** Wrap BrandContextCard bằng `React.forwardRef()` để loại bỏ warning.

**File:** `src/components/topic/chatbot/BrandContextCard.tsx`

---

## 2. Duplicate Feedback UI - 2 hệ thống feedback chồng nhau

**Lỗi hiện tại:** Mỗi assistant message hiển thị **cả hai**:
- `ContentFeedback` (dòng 278-288): Thumbs up/down + tags + comment, lưu vào bảng `content_feedback`
- `MessageFeedback` (dòng 303-311): Thumbs up/down + Regenerate button, KHÔNG lưu DB

Kết quả: User thấy **4 nút thumbs** trên mỗi tin nhắn, rất confusing.

**Fix:** 
- Xoá `MessageFeedback` cũ (chỉ là UI local, không persist)
- Di chuyển nút "Tạo lại" (Regenerate) ra ngoài cạnh timestamp, tách khỏi feedback
- Giữ `ContentFeedback` làm hệ thống feedback duy nhất (đã lưu DB)

**File:** `src/components/topic/chatbot/ChatMessageBubble.tsx`

---

## 3. ContentFeedback dùng `as any` type cast

**Lỗi hiện tại:** `supabase.from('content_feedback' as any)` — bảng đã có trong types.ts, không cần cast.

**Fix:** Bỏ `as any`, dùng trực tiếp `supabase.from('content_feedback')`.

**File:** `src/components/chat/ContentFeedback.tsx`

---

## Chi tiet ky thuat

| File | Thay doi |
|------|----------|
| `BrandContextCard.tsx` | Wrap component bang `forwardRef` |
| `ChatMessageBubble.tsx` | Xoa `MessageFeedback`, giu `ContentFeedback`, chuyen nut Regenerate ra khu vuc timestamp |
| `ContentFeedback.tsx` | Bo `as any` cast |

Tat ca fix deu nho, khong thay doi kien truc. Sau khi hoan thanh, khong con console warning va UX feedback thong nhat 1 he thong duy nhat.
