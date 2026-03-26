

# Thêm DashScope (Alibaba Cloud) Provider

## Tổng quan
Thêm DashScope làm provider mới trong hệ thống multi-provider, **không thay thế** bất kỳ provider nào hiện có. Admin có thể chọn DashScope models khi cấu hình Agent hoặc Channel.

## Thay đổi

### 1. Backend: `supabase/functions/_shared/ai-provider.ts`

- Thêm endpoint vào `PROVIDER_ENDPOINTS`:
  ```
  dashscope: "https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions"
  ```
- Thêm model prefix mapping vào `MODEL_TO_PROVIDER`:
  ```
  "qwen-": "dashscope"    // qwen-plus, qwen-max, qwen-turbo
  "qwen2": "dashscope"    // qwen2.5-*, qwen2-*
  ```
- Tạo function `callDashScope()` — tương tự `callOpenRouter` vì DashScope là OpenAI-compatible. API key từ `DASHSCOPE_API_KEY` env var.
- Thêm `case "dashscope"` vào switch trong `callAI()` routing logic (line ~718)

### 2. Frontend: `src/types/aiProvider.ts`

- Thêm `'dashscope'` vào `AIProviderType`
- Thêm entry mới vào `AI_PROVIDERS` array:
  ```
  id: 'dashscope'
  name: 'DashScope (Alibaba Cloud)'
  models: ['qwen-plus', 'qwen-max', 'qwen-turbo', 'qwen-vl-max', 'qwen-long']
  getKeyUrl: 'https://dashscope.console.aliyun.com/'
  icon: '☁️'
  ```

### 3. Frontend: AI Management UI

- Kiểm tra component cấu hình Agent model có tự động hiển thị models từ `AI_PROVIDERS` không — nếu có thì không cần sửa thêm UI

### Không thay đổi
- Tất cả edge functions giữ nguyên — chúng đã dùng `callAIWithMetrics` hoặc sẽ route qua `callAI`
- Các provider khác không bị ảnh hưởng
- Secret `DASHSCOPE_API_KEY` đã được user thêm sẵn

