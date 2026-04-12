

# Redesign WorkflowSection — Flow Chung + Phân Nhánh

## Concept

Thay vì 6 bước tuyến tính, WorkflowSection sẽ trình bày dạng **"Y-shaped flow"**:
- **Bước chung**: Brand Setup (điểm xuất phát duy nhất)
- **Phân nhánh thành 2 đường**:
  - **Nhánh trái — "Nội dung đa kênh"** (tạo nhanh): Topic → Chọn loại → AI tạo → Ảnh → Duyệt/Publish
  - **Nhánh phải — "AI Agent Campaign"** (tự động hoá toàn diện): Research → Strategy → Create → Review → Publish

```text
                 ┌─────────────┐
                 │ Brand Setup │
                 └──────┬──────┘
                        │
              ┌─────────┴─────────┐
              ▼                   ▼
     ┌────────────────┐  ┌────────────────┐
     │  Nội dung      │  │  AI Agent      │
     │  Đa kênh       │  │  Campaign      │
     │                │  │                │
     │ 1. Chọn Topic  │  │ 1. Research    │
     │ 2. Chọn loại   │  │ 2. Strategy    │
     │ 3. AI tạo      │  │ 3. Create      │
     │ 4. Tạo ảnh     │  │ 4. Review      │
     │ 5. Duyệt &     │  │ 5. Publish     │
     │    Publish      │  │                │
     └────────────────┘  └────────────────┘
```

## Thiết kế chi tiết

### 1. Điểm xuất phát chung — Brand Setup
- Card trắng premium ở trung tâm, giống style hiện tại (accent line, shadow, step number)
- Kèm screenshot `workflow-brand.png`
- Dưới card: animated connector line phân tách thành 2 nhánh (SVG Y-shape với dash animation)

### 2. Hai nhánh — Tab/Toggle switching
- Vì không gian hạn chế, dùng **toggle button** (2 nút) ngay dưới Brand Setup để chọn xem nhánh nào
- Nhánh được chọn hiển thị các steps dọc (timeline giống hiện tại) với scroll-driven animation
- Nhánh kia ẩn (AnimatePresence fade)
- Toggle labels: "⚡ Tạo nhanh" vs "🤖 AI Agent"
- Toggle style: pill buttons, active = bg-primary text-white, inactive = bg-muted

### 3. Nhánh "Tạo nhanh" — 5 bước
| # | Title | Mô tả | Screenshot |
|---|-------|-------|------------|
| 1 | Chọn chủ đề | AI gợi ý trending topics + chọn từ Topic Bank | workflow-topic.png |
| 2 | Chọn loại content | Multichannel, Video Script, Carousel, Ad Copy | (content type cards) |
| 3 | AI tạo nội dung | AI tự đánh giá & cải thiện, tuân thủ brand voice | workflow-ai-content.png |
| 4 | Tạo ảnh AI | Auto-resize & logo overlay cho từng kênh | (no image) |
| 5 | Duyệt & Xuất bản | Review, lên lịch, publish tự động | workflow-publish.png |

### 4. Nhánh "AI Agent" — 5 bước
| # | Title | Mô tả |
|---|-------|-------|
| 1 | Nghiên cứu | AI phân tích thị trường, đối thủ, xu hướng |
| 2 | Lên chiến lược | Lập content plan, phân bổ kênh, lịch đăng |
| 3 | Sáng tạo nội dung | Tự động tạo content đa kênh theo plan |
| 4 | Rà soát & Chấm điểm | Self-critique, compliance check, tối ưu |
| 5 | Phê duyệt & Xuất bản | Duyệt → lên lịch → publish tự động |

### 5. Animation & Interaction
- Toggle chuyển nhánh: AnimatePresence fade + slide nhẹ
- Timeline dọc scroll-driven giữ nguyên cho nhánh đang active
- Step cards giữ style premium hiện tại (accent line, shadow, hover lift)
- SVG connector Y-shape animated với dashed line giống Pipeline

### 6. Section header update
- Badge: "Cách Flowa hoạt động"
- Title: "Hai cách tạo content" + highlight "từ Brand đến Publish"
- Subtitle mô tả ngắn 2 workflow paths

## i18n
- Thêm keys mới cho 2 nhánh trong `vi.json`, `en.json`, `th.json`
- Giữ lại keys hiện tại cho các bước trùng, thêm keys cho bước mới

## Files thay đổi
- **Edit**: `src/landing/components/WorkflowSection.tsx` — redesign layout
- **Edit**: `src/i18n/locales/vi.json` — thêm/sửa workflow keys
- **Edit**: `src/i18n/locales/en.json` — tương tự
- **Edit**: `src/i18n/locales/th.json` — tương tự

## Giữ nguyên
- Image imports, Embla Carousel logic (cho steps có ảnh)
- Design system, primary color, card style
- Responsive breakpoints
- Scroll-driven timeline animation (áp dụng cho nhánh active)

