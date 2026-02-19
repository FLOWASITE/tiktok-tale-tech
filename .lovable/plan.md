
# Đánh giá & Kế hoạch hoàn thiện tích hợp kie.ai

## Hiện trạng — Những gì đã hoàn thành tốt

### Backend (Edge Functions) — ✅ Hoàn chỉnh
- `_shared/kie-image-generator.ts`: Helper async đầy đủ (submit → poll → result)
- `generate-brand-image/index.ts`: Routing KIE ↔ Lovable AI theo model prefix, fallback logic
- `edit-image-background/index.ts`: Tương tự, hỗ trợ image editing
- `_shared/ai-config.ts`: Default config cho `edit-image-background` đã có
- `KIE_API_KEY`: Đã được thêm vào Secrets ✅

### Frontend Config — ✅ Gần hoàn chỉnh
- `useAIConfig.ts`: `MODELS_BY_TYPE['image']` đã có 4 KIE models, `MODEL_INFO` đã có entries đầy đủ
- `ModelCard.tsx`: Provider style `kie` (violet) đã có badge "KIE.ai" ✅

---

## Vấn đề còn tồn tại — Cần hoàn thiện

### Vấn đề 1: ModelSelector KHÔNG hiển thị KIE models cho image functions

Trong `ModelSelector.tsx`, provider tabs chỉ có `'lovable' | 'openrouter'`:
```typescript
type ProviderFilter = 'all' | 'lovable' | 'openrouter';  // Thiếu 'kie'
```

Và khi filter image functions, KIE models nằm trong `filteredModels.lovable` (vì chúng được lấy từ `MODELS_BY_TYPE[functionType]`), nhưng **không có section riêng** để phân biệt KIE vs Lovable trong UI. Admin nhìn vào thấy `flux-kontext-pro` lẫn lộn với `google/gemini-3-pro-image-preview` trong cùng một nhóm "Lovable AI" — không nhất quán về thương hiệu.

**Cần sửa**: Tách KIE models ra hiển thị riêng với header violet trong model list, đặc biệt khi `functionType === 'image'`.

### Vấn đề 2: `getModelInfo()` không nhận biết KIE models là 'kie' provider

Trong `useAIConfig.ts` (line 439-440):
```typescript
const isLovableModel = isLovableAIModel(modelId);
return {
  provider: isLovableModel ? 'lovable' : 'openrouter',  // ← KIE bị map thành 'openrouter'
};
```

Hàm `getModelInfo()` dùng fallback nhưng không có logic nhận biết KIE prefix. Nếu một model KIE không có entry trong `MODEL_INFO` (ví dụ admin gõ tay `grok-imagine`), nó sẽ hiển thị với badge **"OpenRouter"** thay vì **"KIE.ai"** — sai.

**Cần sửa**: Bổ sung check `isKieModelFrontend(modelId)` vào `getModelInfo()` fallback.

### Vấn đề 3: `AIFunctionConfig.tsx` — QUICK_PRESETS cho image function

Hiện tại Quick Presets chỉ show khi `currentFunctionMeta?.type === 'text'`:
```typescript
{currentFunctionMeta?.type === 'text' && (
  <>
    <QuickSelectButton label={QUICK_PRESETS.fast.model}.../>
    <QuickSelectButton label={QUICK_PRESETS.quality.model}.../>
  </>
)}
```

Với image functions, Admin chỉ thấy "Mặc định" + nút "Chọn model khác". Không có shortcut để chọn nhanh `flux-kontext-pro` (giá rẻ) vs `gpt-image-1` (chất lượng cao) vs `google/gemini-3-pro-image-preview` (Lovable AI).

**Cần sửa**: Thêm `IMAGE_QUICK_PRESETS` cho image functions (3 model tiêu biểu).

### Vấn đề 4: Không có cảnh báo về KIE API Key khi Admin chọn KIE model

Nếu Admin chọn `flux-kontext-pro` nhưng `KIE_API_KEY` chưa được cấu hình, lỗi chỉ xuất hiện khi người dùng thực sự tạo ảnh (runtime). Không có warning nào ở Admin Panel lúc cấu hình.

**Cần sửa**: Thêm info badge trong FunctionCard hoặc ModelSelector để cảnh báo "KIE model yêu cầu KIE_API_KEY".

### Vấn đề 5 (nhỏ): `generate-social-image` Edge Function chưa có KIE routing

Kiểm tra `AI_FUNCTIONS`: `generate-social-image` có type `image` với default `gemini-3-pro-image-preview`. Admin có thể muốn dùng KIE cho social image cũng. Nếu Edge Function này chưa được cập nhật giống `generate-brand-image`, KIE model được chọn sẽ bị bỏ qua.

---

## Chi tiết thực hiện

### Sửa 1: `useAIConfig.ts` — Thêm KIE prefix detection vào `getModelInfo()`

```typescript
// Thêm helper check KIE model ở frontend
const KIE_MODEL_PREFIXES = ['flux-kontext', 'gpt-image', 'grok-imagine'];
const isKieModelId = (modelId: string) => KIE_MODEL_PREFIXES.some(p => modelId.startsWith(p));

// Trong getModelInfo() fallback:
export const getModelInfo = (modelId: string): ModelInfo => {
  if (MODEL_INFO[modelId]) return MODEL_INFO[modelId];
  
  if (isKieModelId(modelId)) {
    return {
      shortName: extractShortName(modelId),
      description: 'KIE.ai image model',
      speed: 'medium', quality: 'high', cost: 'low',
      bestFor: ['Image generation'],
      provider: 'kie',
    };
  }
  
  const isLovableModel = isLovableAIModel(modelId);
  return {
    ...
    provider: isLovableModel ? 'lovable' : 'openrouter',
  };
};
```

### Sửa 2: `ModelSelector.tsx` — Tách KIE section riêng cho image functions

Khi `functionType === 'image'`, tách `filteredModels.lovable` thành 2 nhóm:
- **Lovable AI** (google/gemini-*): section xanh dương
- **KIE.ai** (flux-kontext-*, gpt-image-*): section violet mới

```typescript
// Tách models trong availableModels
const { kieModels, lovableOnlyModels } = useMemo(() => {
  if (functionType !== 'image') {
    return { kieModels: [], lovableOnlyModels: filteredModels.lovable };
  }
  return {
    kieModels: filteredModels.lovable.filter(id => isKieModelId(id)),
    lovableOnlyModels: filteredModels.lovable.filter(id => !isKieModelId(id)),
  };
}, [filteredModels.lovable, functionType]);
```

Sau đó render 2 sections riêng biệt với màu violet cho KIE.

### Sửa 3: `AIFunctionConfig.tsx` — Thêm IMAGE_QUICK_PRESETS

```typescript
const IMAGE_QUICK_PRESETS = {
  lovable_fast: { 
    label: 'Gemini Flash Image', 
    description: 'Lovable AI - Nhanh & tiết kiệm', 
    model: 'google/gemini-2.5-flash-image' 
  },
  kie_balanced: { 
    label: 'Flux Kontext Pro', 
    description: 'KIE.ai - Chất lượng cao, giá rẻ ⭐', 
    model: 'flux-kontext-pro' 
  },
  lovable_quality: { 
    label: 'Gemini 3 Image', 
    description: 'Lovable AI - Chất lượng cao nhất', 
    model: 'google/gemini-3-pro-image-preview' 
  },
};
```

Hiển thị IMAGE_QUICK_PRESETS thay vì text QUICK_PRESETS khi `currentFunctionMeta?.type === 'image'`.

### Sửa 4 (nhỏ): Badge cảnh báo KIE API Key trong ModelSelector

Khi functionType là `image` và model được chọn là KIE model, hiển thị:
```
ℹ️ KIE.ai models yêu cầu KIE_API_KEY trong Secrets
```

---

## Files cần thay đổi

| File | Thay đổi | Mức độ |
|------|----------|--------|
| `src/hooks/useAIConfig.ts` | Thêm KIE prefix detection trong `getModelInfo()` fallback | Nhỏ |
| `src/components/admin/ai/ModelSelector.tsx` | Tách KIE models ra section riêng khi image type | Trung bình |
| `src/components/admin/ai/AIFunctionConfig.tsx` | Thêm IMAGE_QUICK_PRESETS cho image functions | Nhỏ |

Không cần thay đổi bất kỳ Edge Function nào — backend đã hoàn chỉnh.

---

## Thứ tự thực hiện

1. Sửa `useAIConfig.ts` — thêm KIE detection
2. Sửa `ModelSelector.tsx` — tách KIE section
3. Sửa `AIFunctionConfig.tsx` — thêm image quick presets
4. Kiểm tra trên Admin Panel: chọn `generate-brand-image` → mở ModelSelector → xác nhận thấy section KIE riêng

---

## Kết quả kỳ vọng

Sau khi hoàn thiện, Admin sẽ thấy trong ModelSelector (khi config image function):

```
[Lovable AI] ─────────────────────
● Gemini 3 Image   ● Gemini Flash Image

[KIE.ai] ─────────────────────────
● Flux Kontext Pro ⭐   ● Flux Kontext Max
● GPT-Image-1           ● GPT-Image-1.5
```

Và trong Quick Presets của image function:
```
[Gemini Flash Image] [Flux Kontext Pro ⭐] [Gemini 3 Image]
```
