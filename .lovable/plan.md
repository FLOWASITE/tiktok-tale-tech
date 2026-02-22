

# Cap nhat them cac model tao anh cua PoYo.ai

## Hien trang
Hien tai he thong chi ho tro 6 model PoYo: `gpt-4o-image`, `gpt-image-1.5`, `z-image`, `flux-2-pro`, `seedream-4.5`, `grok-imagine`. Theo docs moi nhat cua PoYo.ai, ho da them nhieu model moi, dac biet la **Nano Banana Pro** (Gemini 3 Pro Image) va cac bien the edit cua tung model.

## Model moi can them

| Model ID | Ten | Mo ta | Gia |
|---|---|---|---|
| `poyo/nano-banana-2` | Nano Banana Pro | Google Gemini 3 Pro Image, 4K, text rendering | $0.05/req |
| `poyo/nano-banana-2-edit` | Nano Banana Pro Edit | Edit variant, multi-image composition | $0.05/req |
| `poyo/gpt-4o-image-edit` | GPT-4o Image Edit | Advanced editing voi mask support | ~$0.04/req |
| `poyo/flux-2-pro-edit` | Flux 2 Pro Edit | Multi-reference editing (8 anh) | ~$0.04/req |
| `poyo/flux-2-flex` | Flux 2 Flex | Adjustable speed vs quality | ~$0.03/req |
| `poyo/flux-2-flex-edit` | Flux 2 Flex Edit | Flexible editing | ~$0.03/req |
| `poyo/seedream-4.5-edit` | Seedream 4.5 Edit | ByteDance edit variant | ~$0.03/req |

## Cac file can thay doi

### 1. `src/hooks/useAIConfig.ts`
- Them 7 model moi vao `MODELS_BY_TYPE['image']` va `MODELS_BY_TYPE['image-direct']`
- Them MODEL_INFO cho tung model voi metadata (speed, quality, cost, bestFor)
- Cap nhat `MODELS_BY_PROVIDER.poyo` tu 6 thanh 13 models
- Danh dau `poyo/nano-banana-2` la `isRecommended: true` (model hot nhat)

### 2. `src/types/aiProvider.ts`
- Cap nhat `models` array cua PoYo provider them 7 model moi
- Cap nhat description: `'Nano Banana Pro, GPT-4o, Flux 2, Seedream 4.5, Z-Image, Grok'`

### 3. `supabase/functions/_shared/poyo-image-generator.ts`
- Cap nhat comment header them cac model moi
- Khong can thay doi logic vi he thong da strip prefix `poyo/` va gui model name truc tiep den API

### 4. `src/components/admin/ai/FunctionCard.tsx`
- Cap nhat `POYO_MODELS` array trong dropdown them cac model moi pho bien nhat (nano-banana-2, flux-2-flex)
- Giu dropdown gon - chi them 2-3 model quan trong nhat, con lai user vao "Cau hinh chi tiet"

### 5. `supabase/functions/_shared/cost-estimator.ts`
- Khong can thay doi vi cost estimator dung cho text models (token-based), PoYo image models tinh theo request

## Chi tiet ky thuat

### MODEL_INFO entries moi:

```text
poyo/nano-banana-2:      speed=medium, quality=premium, cost=low,    bestFor=['4K images', 'Text rendering', 'Multi-language']
poyo/nano-banana-2-edit: speed=medium, quality=premium, cost=low,    bestFor=['Image editing', '4K refinement']
poyo/gpt-4o-image-edit:  speed=medium, quality=premium, cost=medium, bestFor=['Mask editing', 'Inpainting']
poyo/flux-2-pro-edit:    speed=slow,   quality=premium, cost=medium, bestFor=['Multi-reference', 'Product editing']
poyo/flux-2-flex:        speed=fast,   quality=high,    cost=low,    bestFor=['Quick generation', 'Flexible quality']
poyo/flux-2-flex-edit:   speed=fast,   quality=high,    cost=low,    bestFor=['Quick editing', 'Flexible']
poyo/seedream-4.5-edit:  speed=medium, quality=high,    cost=medium, bestFor=['4K editing', 'Commercial photos']
```

### FunctionCard POYO_MODELS update:
Them `poyo/nano-banana-2` va `poyo/flux-2-flex` vao danh sach quick select (2 model moi dang duoc highlight tren trang chu PoYo)

