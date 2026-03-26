

# Cải thiện Gợi ý Thông điệp chính & CTA — Step 2 Campaign

## Thay đổi

### 1. Thêm gợi ý Thông điệp chính chuẩn Marketing

Thêm mảng `KEY_MESSAGE_SUGGESTIONS` phân theo `campaign_type`, mỗi loại có 4-6 gợi ý phù hợp:

- **Awareness**: "Giải pháp #1 cho [ngành]", "Đột phá công nghệ mới", "Được tin dùng bởi hàng nghìn khách hàng", "Cam kết chất lượng hàng đầu"
- **Engagement**: "Cộng đồng sáng tạo cùng nhau", "Chia sẻ câu chuyện của bạn", "Kết nối - Trải nghiệm - Yêu thích"
- **Conversion**: "Tiết kiệm đến 30% chi phí", "Ưu đãi có hạn", "Miễn phí dùng thử 14 ngày", "Hoàn tiền nếu không hài lòng"
- **Retention**: "Ưu đãi dành riêng cho khách hàng thân thiết", "Nâng cấp trải nghiệm", "Đồng hành cùng bạn"

Hiển thị dưới dạng badge outline (dashed border, text primary) với icon `+`, click để thêm nhanh. Chỉ hiển thị gợi ý chưa được chọn. Đúng style brand hiện tại (pink/primary tones).

### 2. Thêm gợi ý CTA dạng badge

Thêm mảng `CTA_SUGGESTIONS` phân theo `campaign_type`:

- **Awareness**: "Tìm hiểu thêm", "Khám phá ngay", "Xem chi tiết"
- **Engagement**: "Tham gia ngay", "Bình luận ý kiến", "Chia sẻ với bạn bè"
- **Conversion**: "Mua ngay", "Đăng ký dùng thử", "Nhận ưu đãi", "Đặt hàng ngay"
- **Retention**: "Nhận ưu đãi VIP", "Gia hạn ngay", "Nâng cấp gói"

Hiển thị dưới input CTA, cùng style badge outline như key messages. Click để fill vào input CTA (replace, vì CTA chỉ có 1 giá trị).

### 3. UI Design

```text
┌─ Thông điệp chính (2/5) ────────────────────┐
│ [Input...........................] [+]        │
│ ┌────────────────┐ ┌──────────────────┐       │
│ │ Chất lượng ✕   │ │ Giá cạnh tranh ✕ │      │  ← Badge filled (đã chọn)
│ └────────────────┘ └──────────────────┘       │
│ ┌─ + Tiết kiệm 30%─┐ ┌─ + Ưu đãi có hạn ─┐ │  ← Badge dashed (gợi ý)
│ └───────────────────┘ └────────────────────┘  │
│ 💡 Gợi ý theo chiến dịch Conversion          │
└───────────────────────────────────────────────┘

┌─ CTA chính ──────────────────────────────────┐
│ [Input..............................]         │
│ ┌─ Mua ngay ─┐ ┌─ Đăng ký ─┐ ┌─ Nhận ưu đãi│ ← Badge gợi ý
│ └────────────┘ └───────────┘ └──────────────┘│
└───────────────────────────────────────────────┘
```

## File thay đổi

- `src/pages/CampaignCreate.tsx` — thêm constants `KEY_MESSAGE_SUGGESTIONS` và `CTA_SUGGESTIONS`, render badge gợi ý ở cả 2 sections

