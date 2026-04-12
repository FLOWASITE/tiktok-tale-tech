

# Nâng cấp Pipeline Diagram — Premium Interactive

## Hiện trạng
Pipeline hiện tại khá cơ bản: 6 icon boxes vuông (`rounded-xl`) nối bằng đường thẳng + mũi tên tĩnh. Không có animation chạy qua pipeline, không có hiệu ứng "đang hoạt động".

## Thiết kế mới

### 1. Sequential "Running" Animation
- Khi pipeline xuất hiện, mỗi step sẽ lần lượt "sáng lên" (highlight) từ Research → Publish như thể Agent đang chạy thật
- Mỗi step highlight trong ~800ms rồi chuyển sang step tiếp theo, step trước trở lại trạng thái "completed" (check icon nhỏ)
- Step cuối (Publish) giữ highlight vĩnh viễn với primary color + subtle pulse

### 2. Animated Connector Lines
- Thay đường thẳng tĩnh bằng **dashed line animated** — các dash di chuyển từ trái sang phải liên tục (CSS animation `stroke-dashoffset`)
- Khi step được highlight, connector tới step đó sẽ chuyển từ `border-color` sang `primary` color, tạo hiệu ứng "dòng chảy"

### 3. Icon Container Upgrade
- Hình tròn thay vì vuông (`rounded-full` thay `rounded-xl`) — phù hợp hơn cho pipeline flow
- Active step: scale lên 1.1 + ring glow primary + icon animate nhẹ
- Completed step: background nhẹ + subtle checkmark overlay
- Pending step: bg-muted như hiện tại

### 4. Progress Trail Effect
- Một thanh progress mỏng (2px) chạy dưới toàn bộ pipeline, fill dần từ trái sang phải đồng bộ với sequential animation
- Tạo cảm giác "pipeline đang thực thi"

### 5. Hover Interaction
- Hover vào mỗi step: hiện tooltip nhỏ mô tả ngắn (ví dụ: "Nghiên cứu thị trường & đối thủ")
- Scale nhẹ icon container

### 6. Pipeline Note nâng cấp
- Thêm animated dot (giống "live" indicator) trước text "Toàn bộ pipeline chạy trong ~10 phút"
- Text fade-in sau khi sequential animation hoàn tất

## Kỹ thuật
- Sử dụng Framer Motion cho sequential highlight (staggered `animate` với `useEffect` timer)
- CSS `@keyframes` cho dashed line animation (stroke-dashoffset)
- Giữ nguyên responsive: mobile vẫn wrap, ẩn connectors trên mobile

## File thay đổi
- **Edit**: `src/landing/components/HeroSection.tsx` — pipeline section

## Giữ nguyên
- Content text, i18n keys
- Design system colors (primary, muted, border)
- Phần Hero phía trên pipeline (tag, headline, CTAs, micro stats)

