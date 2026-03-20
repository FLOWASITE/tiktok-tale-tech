

# Cải thiện UI/UX AI Script Analyzer — Rộng rãi, Chuyên nghiệp, Sang trọng

## Vấn đề hiện tại

Analyzer panel bị hẹp (w-72 / w-80 ~ 288-320px), khiến Score Rings co lại, biểu đồ nhỏ, nội dung chen chúc. Layout sidebar hạn chế khả năng hiển thị dữ liệu phân tích chuyên nghiệp.

## Giải pháp

### 1. Mở rộng panel sidebar
- Tăng từ `w-72 md:w-80` lên `sm:w-[380px] md:w-[420px]` trong `ScriptViewer.tsx`
- Tăng `max-w-6xl` thành `max-w-7xl` khi panel mở để có đủ không gian

### 2. Redesign ScriptAnalyzer — Soft Luxury style

**Overall Score Hero Section:**
- Card rộng hơn với padding `p-6`, gradient background tinh tế hơn
- Thêm decorative element (subtle radial gradient hoặc dot pattern)
- Score hiển thị lớn hơn (text-5xl), grade badge sang trọng hơn với background riêng
- Thêm timestamp "Phân tích lúc..." nhỏ bên dưới

**Score Rings → Score Cards:**
- Chuyển từ grid 5 cols (quá chật) sang layout 2 hàng: 3+2 hoặc grid responsive
- Tăng kích thước ring (size 64-68), thêm score label rõ ràng hơn
- Mỗi ring có subtle background card riêng với hover effect
- Thêm micro-description cho mỗi metric (vd: "Hook — 3s đầu", "CTA — Kêu gọi hành động")

**Strengths & Weaknesses:**
- Card rộng rãi hơn với padding p-4, icon lớn hơn
- Typography nổi bật: header text-xs → text-sm
- Bullet items spacing thoáng hơn (space-y-2.5)
- Thêm divider line tinh tế giữa các items

**Emotional Arc Chart:**
- Chart cao hơn: h-36 → h-44
- Thêm header description nhỏ giải thích biểu đồ
- Emotion pills lớn hơn, rõ ràng hơn

**Suggestion Cards:**
- Padding tăng p-3 → p-4
- Icon container lớn hơn (w-8 h-8)
- Message text size tăng lên text-sm
- Thêm subtle separator giữa các cards

**Empty/Loading States:**
- Icon lớn hơn, spacing rộng rãi hơn
- Description text rõ ràng, font-size lớn hơn

### 3. Spacing & Typography tổng thể
- Section gap: space-y-5 → space-y-6
- Section headers: thêm bottom margin, font-size lên text-xs tracking-widest
- Tất cả border-radius thống nhất rounded-2xl cho major cards

## Files cần sửa

| File | Thay đổi |
|------|----------|
| `src/components/ScriptViewer.tsx` | Mở rộng sidebar width, max-w dialog |
| `src/components/script/ScriptAnalyzer.tsx` | Redesign toàn bộ layout với spacing rộng rãi, typography sang trọng |

