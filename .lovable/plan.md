

## Vấn đề

Khi user chọn/tạo chủ đề về "bán hàng", hệ thống vẫn giữ mặc định `contentGoal = 'education'` → dẫn đến chiến lược hiển thị "Nhận diện" (awareness) + "Kiến thức" (educational), không phù hợp với intent bán hàng.

**Nguyên nhân gốc:** Form data khởi tạo với `contentGoal: 'education'` (dòng 391) và không có logic nào phân tích nội dung chủ đề để gợi ý goal phù hợp hơn.

## Giải pháp: Auto-detect Goal từ Topic

Thêm logic phát hiện từ khóa trong chủ đề để tự động gợi ý `contentGoal` phù hợp.

### Thay đổi trong `MultiChannelFormWizard.tsx`

**1. Thêm hàm `detectGoalFromTopic`**
- Phân tích text chủ đề theo keyword patterns:
  - **Conversion**: `bán hàng, mua, giảm giá, khuyến mãi, đặt hàng, sale, chốt đơn, ưu đãi, deal, flash sale, voucher, order`
  - **Awareness**: `giới thiệu, ra mắt, thương hiệu, brand, nhận diện, launch`
  - **Education**: `hướng dẫn, cách, bí quyết, tips, kiến thức, tutorial, how to`
  - **Engagement**: `thảo luận, bình chọn, chia sẻ, poll, quiz, hỏi đáp`
  - **Expertise**: `chuyên gia, phân tích, nghiên cứu, insight, trend, báo cáo`
- Trả về goal có nhiều keyword match nhất, hoặc `null` nếu không detect được

**2. Gọi auto-detect khi user hoàn tất nhập topic**
- Khi topic thay đổi và đủ dài (≥10 ký tự), chạy `detectGoalFromTopic`
- Nếu detect được goal khác default → tự động cập nhật `contentGoal` + hiển thị toast nhỏ thông báo "Đã tự động chọn Mục tiêu: Chuyển đổi dựa trên chủ đề"
- User vẫn có thể thay đổi thủ công bằng cách click vào goal khác
- Chỉ auto-detect 1 lần khi user nhập topic mới (không override nếu user đã chủ động chọn)

### Files cần sửa
- `src/components/multichannel/MultiChannelFormWizard.tsx` — thêm `detectGoalFromTopic` + useEffect auto-detect

