

# Bổ sung DashScope (Alibaba Cloud) vào tất cả UI chọn Model

## Vấn đề
DashScope đã có trong `MODELS_BY_PROVIDER` và `AI_PROVIDERS`, nhưng các model Qwen không xuất hiện trong ModelSelector vì thiếu ở nhiều chỗ:
- `MODELS_BY_TYPE.text` không có model DashScope
- `MODEL_INFO` không có entries cho qwen-plus/max/turbo/vl-max/long
- `ModelInfo.provider` type không có `'dashscope'`
- `ModelSelector` không có tab/filter cho DashScope
- Không có helper `isDashScopeModel()`
- `getModelInfo()` fallback không nhận diện DashScope models

## Thay đổi

### 1. `src/hooks/useAIConfig.ts`

- Thêm 5 model DashScope vào `MODELS_BY_TYPE.text`: `qwen-plus`, `qwen-max`, `qwen-turbo`, `qwen-vl-max`, `qwen-long`
- Mở rộng `ModelInfo.provider` type thêm `'dashscope'`
- Thêm 5 entries vào `MODEL_INFO` với metadata chi tiết (shortName, description, speed, quality, cost, bestFor, provider)
- Thêm `DASHSCOPE_MODEL_PREFIXES` và helper `isDashScopeModel()`
- Cập nhật `getModelInfo()` fallback để nhận diện DashScope models (trả provider `'dashscope'`)

### 2. `src/components/admin/ai/ModelSelector.tsx`

- Thêm `'dashscope'` vào `ProviderFilter` type
- Thêm logic split DashScope models (tương tự KIE/PoYo) trong `filteredModels`
- Thêm tab provider "DashScope" với icon ☁️ và count
- Thêm section hiển thị DashScope models trong danh sách (header orange, badge `DASHSCOPE_API_KEY`)
- Cập nhật `totalModels` count

### 3. `src/components/admin/ai/AIAgentModelConfig.tsx`

- Thêm model DashScope vào `recommendedModels` của một số agent (Strategy, Create, Analyze) trong `ALL_AGENTS` — thực tế nằm ở `useAgentModelConfig.ts`, cần thêm `qwen-plus` hoặc `qwen-max` vào recommended list

### Không thay đổi
- Backend edge functions — đã xử lý routing DashScope
- Database — constraint đã được cập nhật
- `AIProviderManager.tsx` — đã có DashScope

