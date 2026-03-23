

# Hiển thị chỉ số đánh giá trên Mockup UI

## Vấn đề hiện tại

Hệ thống có **4 loại chỉ số** cho bài viết, nhưng tất cả đều nằm ở sidebar/header — **không có chỉ số nào hiển thị trực tiếp trên Mockup preview**:

| Chỉ số | Vị trí hiện tại | Trên Mockup? |
|--------|-----------------|--------------|
| **Critique Score** (điểm chất lượng nội dung) | Badge trên header toolbar | ✗ |
| **Content Analytics** (readability, sentiment, engagement, keywords) | Panel collapsible trong sidebar | ✗ |
| **GEO Score** (8 yếu tố AI visibility) | Panel riêng trong sidebar | ✗ |
| **SEO Score** (chỉ cho channel website) | Badge góc trên mockup website | ✓ (chỉ website) |
| **Engagement Metrics** (likes, comments, shares) | Component tồn tại nhưng **không được import/sử dụng** ở đâu cả | ✗ |

## Giải pháp: Thêm chỉ số overlay lên Mockup

### 1. Engagement Metrics trên Mockup social channels
- Import `EngagementMetrics` vào `ChannelMockupFrame.tsx`
- Hiển thị likes/comments/shares giả lập ở footer của mỗi mockup Facebook, LinkedIn, Instagram, TikTok (đúng vị trí như trên app thật)
- Component này đã có sẵn, chỉ cần gắn vào đúng chỗ

### 2. Score Summary Bar dưới Mockup
- Tạo component `MockupScoreBar.tsx` — thanh nhỏ hiển thị dưới mỗi mockup preview
- Hiển thị 3 chỉ số chính dạng compact:
  - **Quality**: critique_score (badge màu, ví dụ "8.5/10")
  - **GEO**: geo_score nếu đã chấm (badge, ví dụ "GEO 78 B")
  - **Engagement est.**: engagement score từ ContentAnalytics (ví dụ "Eng: 72%")
- Chỉ hiện các chỉ số đã có data, ẩn nếu chưa chấm

### 3. Tích hợp vào ContentMockupToggle
- Wrap mockup + score bar trong `ContentMockupToggle.tsx`
- Truyền props: `critiqueScore`, `geoScore`, `engagementScore`
- Score bar nằm ngay dưới mockup frame, không cần scroll

### Files cần sửa/tạo
- `src/components/preview/ChannelMockupFrame.tsx` — import & render `EngagementMetrics` trong footer các social mockups
- `src/components/preview/MockupScoreBar.tsx` — component mới
- `src/components/viewer/ContentMockupToggle.tsx` — thêm MockupScoreBar
- `src/components/MultiChannelViewer.tsx` — truyền score data xuống ContentMockupToggle

