

## Kiểm tra: Gợi ý Layout & Text khi tạo ảnh

### Kết quả phân tích

Code hiện tại **đã được triển khai đúng** theo cả 3 plan trước đó. Không phát hiện bug logic.

### Flow hoạt động hiện tại

```text
1. getFullChannelContent() → lấy ~2000 chars nội dung bài viết
2. decomposeRequestWithAI() gửi đến Edge Function với context:
   - contentRole (seed/sprout/harvest)
   - contentGoal (awareness/education/conversion)
   - contentAngle (educational/storytelling/promotional...)
   - topic
3. Edge Function (decompose-image-request):
   - System prompt chứa CHIẾN LƯỢC CHỌN LAYOUT chi tiết
   - AI trả về: suggestedLayout + backgroundPrompt + overlayConfig
   - Ví dụ: education/sprout → "infographic", awareness/seed → "quote_card"
4. Frontend (SimpleImageGenerator):
   - Auto mode: ưu tiên AI suggestedLayout → fallback heuristic
   - applyTemplate() áp dụng layout + đảm bảo required slots
   - Layout mapping: infographic→split, poster→stack, quote_card→hero_text, feature_list→banner_cards
```

### Không có vấn đề nào trong code

- **Layout selection**: AI suggestedLayout được ưu tiên đúng khi auto mode (line 457-459)
- **Template application**: `applyTemplate` trả về đúng layout type từ template definition (line 456)
- **Text content**: AI nhận đủ 2000 chars + strategic context để tạo text phù hợp
- **Fallback**: Regex decomposition + heuristic `autoSelectTemplate` vẫn hoạt động khi AI fail

### Khuyến nghị

Hiện tại chưa có log nào từ Edge Function hoặc Console (chưa trigger tạo ảnh). Để kiểm tra thực tế, bạn cần:

1. **Tạo thử 1 bài giáo dục** (education/sprout) → kiểm tra AI có chọn `infographic` không
2. **Tạo thử 1 bài bán hàng** (conversion/harvest) → kiểm tra AI có chọn `poster` không
3. Mở Console (F12) → tìm log `[AutoTemplate]` và `[HybridImageGen]` để xem suggestedLayout

Bạn muốn tôi test trực tiếp trên preview không?

