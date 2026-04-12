

# Hoàn thiện nội dung AI Agent Flow — "5 bước, bạn chỉ làm bước 1"

## Thay đổi

### 1. Cập nhật Agent Flow header & subtitle
Thay label hiện tại "AI Agent Campaign" bằng: **"5 bước — bạn chỉ làm bước 1"** và thêm subtitle mô tả.

### 2. Overhaul nội dung 5 bước Agent (vi/en/th)

Hiện tại các bước agent rất ngắn, thiếu chi tiết. Sẽ thay toàn bộ bằng nội dung marketing đầy đủ theo yêu cầu:

| Step | Title (VI) | Tag | Nội dung chính |
|------|-----------|-----|----------------|
| 1 | Bạn đặt mục tiêu | BẠN LÀM | 3 ví dụ câu lệnh tự nhiên + note "Không cần brief template" |
| 2 | Agent nghiên cứu & lên chiến lược | AGENT LÀM | 4 bullet: xu hướng, đối thủ, recall bài cũ, phân bổ journey |
| 3 | Tạo nội dung — đã tối ưu cho từng kênh | AGENT LÀM | FB storytelling, TikTok hook 3s, LinkedIn thought leadership + note "tái cấu trúc hoàn toàn" |
| 4 | Tự đánh giá — tự sửa | AGENT LÀM | 8 tiêu chí, tổng 100 điểm, logic < 75 tự sửa |
| 5 | Duyệt & đăng bài | TỰ ĐỘNG/BẠN DUYỆT | Smart Auto-Approve, 12 kênh hỗ trợ |

### 3. Thay đổi code WorkflowSection.tsx

- Thêm **tag badge** (BẠN LÀM / AGENT LÀM / TỰ ĐỘNG) cho mỗi step card agent flow
- Thêm **examples list** cho step 1 (3 ví dụ câu lệnh)
- Thêm **bullet list** cho step 2, 3, 4 (hiển thị các items chi tiết)
- Thêm **channel badges** cho step 5 (12 kênh)
- Thêm **note text** nhỏ italic cho step 1 và step 3
- Cập nhật `agentSteps` config để enable các feature mới (`hasExamples`, `hasBullets`, `hasTag`, `hasChannels`)
- Mở rộng `FlowStepCard` để render các element mới khi `flowPrefix === "agentFlow"`

### 4. i18n keys mới (agentFlow)

Mỗi step sẽ có thêm:
- `tag`: "BẠN LÀM" / "AGENT LÀM" / "TỰ ĐỘNG HOẶC BẠN DUYỆT"
- `subtitle`: mô tả phụ ngắn
- `examples[]`: mảng ví dụ (step 1)
- `bullets[]`: mảng bullet points (step 2, 3, 4)
- `note`: ghi chú nhỏ (step 1, 3, 4)
- `channels[]`: danh sách kênh (step 5)

## Files thay đổi
- **Edit**: `src/landing/components/WorkflowSection.tsx` — mở rộng FlowStepCard, thêm agent-specific rendering
- **Edit**: `src/i18n/locales/vi.json` — overhaul agentFlow content
- **Edit**: `src/i18n/locales/en.json` — tương tự EN
- **Edit**: `src/i18n/locales/th.json` — tương tự TH

