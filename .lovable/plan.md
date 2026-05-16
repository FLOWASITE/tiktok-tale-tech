## Vấn đề phát hiện

Sau khi rà lại trang **Admin → AI** (Functions / Channel / Agent / Group Defaults), 9Router mới chỉ có mặt ở:
- `AI_PROVIDERS` (card Providers tab)
- `MODELS_BY_PROVIDER.ninerouter` (16 model IDs)
- `getModelInfo()` nhận prefix `9router/`
- Edge function `test-ai-connection`

Nhưng **chưa thể chọn model 9Router cho bất kỳ Function/Channel/Agent nào** vì 5 lỗ hổng sau:

### 1. `MODELS_BY_TYPE.text` thiếu 16 model `9router/*`
File `src/hooks/useAIConfig.ts` (line 151). Cả `ModelSelector` lẫn `InlineModelPicker` đều đọc `MODELS_BY_TYPE[functionType]` để render danh sách. Không có ở đây = không hiện ở đâu cả.

### 2. Thiếu helper `isNineRouterModel()` + `NINEROUTER_MODEL_PREFIXES`
Các picker phân nhóm provider bằng `isKieModel / isPoyoModel / isDashScopeModel / isGeminigenModel`. Không có helper cho 9router → models sẽ rớt vào nhóm "Lovable AI" sai.

### 3. `ModelSelector.tsx` (Function tab)
- `ProviderFilter` union (line 32) chưa có `'ninerouter'`
- `lovableOnly` filter (line 84-86) chưa exclude 9router → model 9router hiển thị nhầm trong tab Lovable
- Thiếu `<ProviderTab provider="ninerouter">` + filter branch
- Thiếu render group cho ninerouter trong phần kết quả

### 4. `InlineModelPicker.tsx` (compact picker per-function)
- `PROVIDER_DOTS` (line 51-58) thiếu entry `ninerouter`
- `getProviderGroups()` (line 85-101): biến `lovable` filter (line 88) chưa exclude 9router; chưa push group `ninerouter`

### 5. `ModelCard.tsx` / provider badge styling
`PROVIDER_DOTS` map dùng chung — cần icon/màu cho `ninerouter` để badge hiện đúng.

---

## Kế hoạch sửa

### File 1: `src/hooks/useAIConfig.ts`
- Thêm hằng `NINEROUTER_MODEL_PREFIXES = ['9router/']` + export `isNineRouterModel(id)` đặt cạnh `isDashScopeModel` (~line 1481).
- Spread 16 model `MODELS_BY_PROVIDER.ninerouter` vào `MODELS_BY_TYPE.text` (sau block OpenRouter, ~line 200).
- Thêm `MODEL_INFO` entries (rút gọn) cho 4-5 model phổ biến: `9router/glm-4.6`, `9router/kimi-k2-0905`, `9router/minimax-m2`, `9router/claude-sonnet-4.6`, `9router/gemini-3-flash-preview` (các model còn lại fallback qua `getModelInfo` default branch đã có).

### File 2: `src/components/admin/ai/ModelSelector.tsx`
- Import `isNineRouterModel` từ `useAIConfig`.
- Mở rộng `ProviderFilter` union: thêm `'ninerouter'`.
- `useMemo` split: thêm `ninerouterModels`, sửa `lovableOnly` filter thêm `&& !isNineRouterModel(id)`.
- Thêm `<ProviderTab provider="ninerouter">` (label "9Router", count = `availableNineRouterModels.length`) hiển thị khi `>0`.
- Thêm nhánh filter `providerFilter === 'ninerouter'`.
- Thêm group render giống Kie/Poyo trong phần kết quả (~line 449+).
- Thêm `filteredModels.ninerouter` vào `totalModels`.

### File 3: `src/components/admin/ai/InlineModelPicker.tsx`
- Import `isNineRouterModel`.
- Thêm `ninerouter: { color: 'bg-slate-600', label: '9Router', emoji: '🔀' }` vào `PROVIDER_DOTS`.
- Trong `getProviderGroups()`:
  - Sửa `lovable` filter thêm `&& !isNineRouterModel(id)`
  - Thêm `const ninerouter = allModels.filter(isNineRouterModel)`
  - Push group `ninerouter` (đặt sau OpenRouter)

### File 4 (tùy chọn — chỉ chạm nếu thực sự hiển thị provider badge):
`src/components/admin/ai/ModelCard.tsx` — kiểm tra có map provider→color riêng không; nếu có, thêm `ninerouter`.

---

## Out of scope
- Không sửa `AIChannelModelConfig` / `AIAgentModelConfig` / `GroupDefaultsPanel` (chúng nhúng `InlineModelPicker` nên auto hưởng).
- Không thêm fetch model list realtime từ `/v1/models` của 9Router.
- Không sửa edge functions backend (đã xong ở vòng trước).
- Không động vào cost dashboard / per-token pricing cho 9router (chưa biết giá).

## Acceptance
1. Mở `/admin/ai → Functions → bất kỳ function text nào → Đổi model`: thấy tab **9Router** với badge count = 16, models hiển thị đúng nhóm.
2. `InlineModelPicker` (compact): khi search "glm" / "kimi" / "minimax", thấy model có provider dot màu slate, label "9Router".
3. Chọn `9router/glm-4.6` → save vào `ai_function_configs.model_override` thành công, không bị classify nhầm vào tab Lovable.
4. Không có regression: tab Lovable AI count giảm đúng bằng số 9router models, các provider khác vẫn nguyên.
