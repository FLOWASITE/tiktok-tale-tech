

# Thêm thông tin Functions đang sử dụng vào mỗi Provider Card

## Mục tiêu
Trong trang **AI Providers** (`AIProviderManager.tsx`), mỗi card Provider hiện chỉ hiển thị tên, trạng thái và API key. Cần bổ sung danh sách **functions đang gắn với model thuộc provider đó**, giúp admin biết provider nào đang phục vụ những tác vụ gì.

## Cách hoạt động

Dữ liệu đã có sẵn:
- `AI_FUNCTIONS` (static, 50+ functions) chứa `currentModel` (model mặc định)
- `ai_function_configs` (DB) chứa `modelOverride` và `forceProvider` (cấu hình thực tế)
- `ai_agent_model_configs` (DB) chứa `modelOverride` cho 6 agents
- `ai_channel_model_configs` (DB) chứa `modelOverride` cho 12 channels
- `getModelInfo()` trả về `provider` cho mỗi model

Logic: Với mỗi provider type, quét tất cả functions/agents/channels, kiểm tra model override (hoặc default model) thuộc provider nào → nhóm lại → hiển thị trên card.

## Thay đổi

### 1. `src/components/admin/ai/AIProviderManager.tsx`

- Import thêm `AI_FUNCTIONS`, `getModelInfo` từ `useAIConfig`, `useAgentModelConfig` (ALL_AGENTS), `useChannelModelConfig` (ALL_CHANNELS)
- Tạo helper `useProviderUsageMap()` — với mỗi provider type, tính danh sách `{ name, model, source }`:
  - **Functions**: Duyệt `AI_FUNCTIONS`, lấy `modelOverride` từ DB config (nếu có) hoặc `currentModel` mặc định → `getModelInfo(model).provider` → nhóm theo provider
  - **Agents**: Duyệt `ALL_AGENTS`, lấy `modelOverride` từ agent configs → nhóm
  - **Channels**: Duyệt `ALL_CHANNELS`, lấy `modelOverride` từ channel configs → nhóm
- Trong mỗi **Provider Card** (`CardContent`), thêm section hiển thị:
  - Tổng số functions/agents/channels đang dùng provider này
  - Danh sách rút gọn (tối đa 5 items, có "xem thêm") với format: `function-name → model-shortName`
  - Phân biệt bằng badge nhỏ: `F` (Function), `A` (Agent), `C` (Channel)
  - Nếu không có item nào → hiển thị "Chưa có function nào sử dụng"

### UI mẫu trên mỗi card

```text
┌─────────────────────────────┐
│ ☁️ DashScope (Alibaba)  [Active] │
│ Qwen Plus, Max, Turbo...         │
│                                   │
│ ✅ API Key đã cấu hình           │
│ Model: qwen-plus                  │
│                                   │
│ 📋 Đang sử dụng (3)              │
│  F generate-multichannel → Qwen+  │
│  A Strategy Agent → Qwen Plus     │
│  C threads → Qwen Plus            │
│                                   │
│ [Chỉnh sửa]  [🗑️]               │
└─────────────────────────────┘
```

### 2. Không thay đổi
- Database, Edge Functions, hooks — chỉ đọc dữ liệu có sẵn
- Các component khác không bị ảnh hưởng

## Kỹ thuật
- Dùng `useMemo` để tính usage map, tránh re-render
- Collapsible list nếu > 5 items (dùng state `showAll`)
- Tooltip cho model name dài

