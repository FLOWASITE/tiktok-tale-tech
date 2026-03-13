

## Phân tích: Hành vi khi user nhập "tạo 1 chủ đề bán hàng..."

### Hiện trạng
Khi user gõ text ≥10 ký tự vào ô chủ đề, hệ thống hiển thị **TopicRefinementSuggestions** — tức là AI sẽ cố gắng *cải thiện* đoạn text đó như thể nó là một chủ đề thực sự. Nhưng "tạo 1 chủ đề bán hàng" rõ ràng là **câu lệnh/yêu cầu**, không phải chủ đề.

### Vấn đề
Hệ thống không phân biệt giữa:
- **Chủ đề thực**: "Cách tối ưu quảng cáo Facebook Ads cho shop online"
- **Câu lệnh AI**: "tạo 1 chủ đề bán hàng cho shop quần áo"

### Giải pháp đề xuất: Phát hiện Intent và chuyển hướng thông minh

**1. Thêm logic phát hiện "câu lệnh" trong `MultiChannelFormWizard.tsx`**
- Detect các pattern như: "tạo", "gợi ý", "cho tôi", "nghĩ giúp", "viết về"... ở đầu câu
- Khi phát hiện → tự động mở **TopicBrainstormSheet** với nội dung đó làm prompt ban đầu
- Xóa text khỏi ô input (vì nó không phải chủ đề)

**2. Truyền `initialPrompt` vào `TopicBrainstormSheet` → `TopicAIChatbot`**
- Khi sheet mở với initialPrompt, chatbot tự động gửi message đầu tiên
- User nhận ngay kết quả gợi ý chủ đề bán hàng từ AI

**3. Fallback**: Nếu user không muốn dùng AI, họ vẫn có thể đóng sheet và sửa text thủ công

### Files cần sửa
- `src/components/multichannel/MultiChannelFormWizard.tsx` — thêm intent detection, auto-trigger brainstorm
- `src/components/multichannel/TopicBrainstormSheet.tsx` — thêm prop `initialPrompt`
- `src/components/topic/TopicAIChatbot.tsx` — nhận và auto-send `initialPrompt`

