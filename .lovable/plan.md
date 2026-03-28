

# Bổ sung AI Functions còn thiếu vào Registry

## Vấn đề
Có **11 edge functions** sử dụng AI gateway nhưng chưa được đăng ký trong `AI_FUNCTIONS`, khiến chúng không hiển thị trong trang cài đặt AI Model.

## Danh sách functions thiếu

| Function | Mô tả | Category | Type | Default Model |
|---|---|---|---|---|
| `improve-script` | Cải thiện kịch bản video | content | text | `google/gemini-3-flash-preview` |
| `optimize-social-text` | Tối ưu text cho mạng xã hội | content | text | `google/gemini-2.5-flash-lite` |
| `clarify-campaign-intent` | Làm rõ ý định chiến dịch | analysis | text | `google/gemini-3-flash-preview` |
| `decompose-image-request` | Phân tách yêu cầu hình ảnh | image | text | `google/gemini-2.5-flash` |
| `extract-broll-keywords` | Trích xuất keywords B-roll | content | text | `google/gemini-2.5-flash` |
| `generate-scene-thumbnail` | Tạo thumbnail cho scene | image | image | `google/gemini-3-pro-image-preview` |
| `validate-seamless-consistency` | Kiểm tra tính nhất quán | analysis | text | `google/gemini-2.5-flash` |
| `geo-scan-brand` | Quét thương hiệu trên AI Search | analysis | search | `sonar` |
| `geo-generate-prompts` | Tạo prompts cho GEO monitoring | analysis | text | `google/gemini-2.5-flash` |
| `geo-track-competitors` | Theo dõi đối thủ cạnh tranh | analysis | text | `google/gemini-2.5-flash-lite` |
| `generate-video` | Tạo/enhance mô tả video | content | text | `google/gemini-3-flash-preview` |

## Thay đổi

### File: `src/hooks/useAIConfig.ts`
Thêm 11 entries vào mảng `AI_FUNCTIONS`, phân bổ theo đúng category hiện có:

- **Content** (3): `improve-script`, `optimize-social-text`, `extract-broll-keywords`, `generate-video`
- **Image** (2): `decompose-image-request`, `generate-scene-thumbnail`
- **Analysis** (4): `clarify-campaign-intent`, `validate-seamless-consistency`, `geo-scan-brand`, `geo-generate-prompts`, `geo-track-competitors`

Mỗi entry bao gồm `name`, `description`, `category`, `type`, `currentModel`, và `tags` (nếu liên quan đến GEO).

