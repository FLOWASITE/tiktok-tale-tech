

# Tích hợp AI Cost Tracking cho tất cả Edge Functions còn thiếu

## Hiện trạng

Hệ thống đã có cơ sở hạ tầng cost tracking hoàn chỉnh:
- Bảng `ai_metrics` lưu trace_id, function_name, model, tokens, estimated_cost_usd
- Utility `cost-estimator.ts` với pricing cho 50+ models
- Helper `saveMetrics()` trong `logger.ts`
- Dashboard hiển thị chi phí (useCostAnalytics, useAIMetrics)

Tuy nhiên, chỉ ~30-40% edge functions thực sự ghi cost. Đặc biệt **toàn bộ pipeline tạo ảnh** -- tính năng tốn chi phí nhất -- chưa được tracking.

## Functions cần thêm cost tracking

### Priority 1 -- Image Pipeline (chi phí cao nhất)
| Function | Mô tả | Model dự kiến |
|----------|--------|---------------|
| `generate-brand-image` | Tạo ảnh AI cho brand | gemini-3-pro-image / gemini-3.1-flash-image |
| `generate-carousel-image` | Tạo ảnh carousel | gemini image models |
| `generate-scene-thumbnail` | Ảnh scene kịch bản | gemini image models |
| `edit-image-background` | Chỉnh sửa nền ảnh | gemini image models |
| `decompose-image-request` | Phân tích prompt ảnh | text model |
| `overlay-brand-logo` | Overlay logo (nếu dùng AI) | -- |

### Priority 2 -- Content Editing & Analysis
| Function | Mô tả |
|----------|--------|
| `ai-edit-channel` | Chỉnh sửa nội dung kênh |
| `topic-ai` | Gợi ý chủ đề |
| `generate-hooks` | Tạo hook câu dẫn |
| `analyze-script` | Phân tích kịch bản |
| `analyze-dashboard-insights` | Phân tích dashboard |
| `learn-from-edits` | Học từ chỉnh sửa user |

### Priority 3 -- Brand & Ad Optimization
| Function | Mô tả |
|----------|--------|
| `generate-brand-voice` | Tạo giọng brand |
| `generate-brand-guideline` | Tạo guideline |
| `optimize-ad-copy` | Tối ưu quảng cáo |
| `score-ad-creative` | Chấm điểm creative |
| `suggest-ad-fix` | Gợi ý sửa quảng cáo |
| `predict-ad-performance` | Dự đoán hiệu suất |

### Priority 4 -- Misc AI Functions
| Function | Mô tả |
|----------|--------|
| `generate-sample-text` | Tạo text mẫu |
| `generate-storyboard` | Tạo storyboard |
| `generate-journey-messaging` | Tạo messaging theo journey |
| `suggest-prompt-rewrite` | Gợi ý viết lại prompt |
| `summarize-conversation` | Tóm tắt hội thoại |
| `enrich-personas` | Làm giàu persona |
| `kpi-ai` | Phân tích KPI |

## Cách triển khai

Mỗi function sẽ được thêm pattern giống nhau:

```text
1. Import: estimateCost, saveMetrics, generateTraceId
2. Tạo traceId ở đầu request
3. Sau khi gọi AI xong, tính tokens + cost
4. Gọi saveMetrics() (non-blocking) ghi vào ai_metrics
```

Với các function đã dùng `callAIWithMetrics()` từ `ai-provider.ts`, metrics đã tự động được ghi -- cần verify từng function xem đã dùng helper này chưa.

Với image generation functions, cần ước lượng cost khác vì image models tính theo request chứ không chỉ tokens.

## Phạm vi thay đổi

- ~20 edge function files cần sửa
- Không cần migration database (bảng `ai_metrics` đã có đủ fields)
- Không thay đổi UI (dashboard cost analytics đã hiển thị từ `ai_metrics`)
- Cần cập nhật `cost-estimator.ts` thêm pricing cho image generation models nếu chưa có

## Kết quả mong đợi

Sau khi hoàn thành:
- 100% AI calls được ghi nhận chi phí
- Dashboard cost analytics phản ánh đúng tổng chi phí thực tế
- Có thể tính toán chi phí per-user để inform pricing decisions
- Phát hiện sớm chi phí bất thường (anomaly detection)

