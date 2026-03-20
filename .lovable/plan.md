

# Phân tích trùng lặp & Phương án gộp

## Phát hiện trùng lặp

### 1. **Topic Summary (Step 2) ↔ Topic Input (Step 1)** — TRÙNG
Step 2 có card "Topic summary" (dòng 570-607) hiển thị lại chủ đề, hook, góc tiếp cận mà user vừa nhập ở Step 1. Đây là thông tin lặp 100% — user vừa nhập xong, chuyển sang Step 2 lại thấy hiển thị lại y hệt.

### 2. **VideoTypeRecommendations + VideoTypeSelector** — TƯƠNG ĐỒNG
Trong popover "Thể loại video" (dòng 641-658), hiện có **2 component cùng chức năng**: `VideoTypeRecommendations` (gợi ý AI, 3-5 items) và `VideoTypeSelector` (danh sách đầy đủ 15 loại). User phải cuộn qua 2 danh sách chồng nhau.

### 3. **CharacterTypeRecommendations + CharacterTypeSelector** — TƯƠNG ĐỒNG
Tương tự, popover "Nhân vật" (dòng 671-690) có `CharacterTypeRecommendations` + `CharacterTypeSelector` chồng nhau.

## Phương án gộp

### A. Xóa Topic Summary card ở Step 2
- Bỏ hoàn toàn card hiển thị lại topic/hook/angle (dòng 570-607)
- Thay bằng **1 dòng text ngắn** trong header: `"Chủ đề: {topic.slice(0,60)}..."` — đủ để user biết context mà không lặp

### B. Gộp Recommendations vào Selector
- Trong popover VideoType: Hiển thị `VideoTypeRecommendations` ở trên (AI gợi ý, tối đa 3), sau đó 1 nút "Xem tất cả ▾" mở `VideoTypeSelector` (collapsible). Tránh hiện cả 2 danh sách cùng lúc.
- Tương tự cho CharacterType popover.

## File thay đổi

| File | Thay đổi |
|------|----------|
| `ScriptFormStepper.tsx` | Xóa Topic Summary card, thêm 1 dòng context text vào header. Gộp Recommendations + Selector trong mỗi popover bằng collapsible "Xem tất cả" |

