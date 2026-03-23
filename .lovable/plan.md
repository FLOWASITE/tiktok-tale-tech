

# Di chuyển Score Bar lên trên Mockup

## Vấn đề
`MockupScoreBar` hiện hiển thị **dưới** mockup (`rounded-b-xl`). User muốn nó hiển thị **trên** mockup, trong khoảng trống giữa header buttons và nội dung mockup (vùng đỏ trong screenshot).

## Giải pháp

### 1. Sửa `ContentMockupToggle.tsx` — đưa scoreBar lên trên mockup
- Di chuyển `{scoreBar}` từ **sau** mockup component lên **trước** nó
- Áp dụng cho cả 3 trường hợp: Google Maps, Zalo OA, và default channel

### 2. Sửa `MockupScoreBar.tsx` — đổi style phù hợp vị trí trên
- Đổi `rounded-b-xl border-t` → `rounded-t-xl border-b` (bo góc trên thay vì dưới)
- Thêm padding và background nhẹ hơn để tạo visual separation

### Files cần sửa
- `src/components/viewer/ContentMockupToggle.tsx` — move `{scoreBar}` trước mockup component (3 chỗ)
- `src/components/preview/MockupScoreBar.tsx` — đổi rounded direction

