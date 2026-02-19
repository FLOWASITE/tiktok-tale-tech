
# Nghiên cứu & Kế hoạch tích hợp kie.ai cho Image Generation

## Tổng quan kie.ai

kie.ai là API gateway tổng hợp cho image, video, music — tương tự OpenRouter nhưng chuyên về media generation thay vì text. Điểm nổi bật:

- Giá **30-50% rẻ hơn** official API (ví dụ: Flux Kontext Pro ~$0.025/ảnh)
- Hỗ trợ 60+ image models: Flux Kontext, GPT-Image-1, Nano Banana Pro (Gemini Flash Image), Grok Imagine, v.v.
- API async: gọi → nhận `taskId` → poll hoặc webhook để lấy kết quả
- Base URL: `https://api.kie.ai`
- Auth: `Authorization: Bearer KIE_API_KEY`

---

## Các model Image nổi bật trên kie.ai

| Model | API Endpoint | Đặc điểm | Giá |
|-------|-------------|-----------|-----|
| Flux Kontext Pro | `/api/v1/flux/kontext/generate` | Text-to-image + editing, chất lượng cao | ~$0.025 |
| Flux Kontext Max | `/api/v1/flux/kontext/generate` | Phức tạp hơn, detail cao hơn | ~$0.04 |
| GPT-Image-1 (4o) | `/api/v1/gpt4o-image/generate` | Instruction following xuất sắc, render text tốt | ~$0.04 |
| GPT-Image-1.5 | `/api/v1/gpt4o-image/generate` | Flagship mới nhất, tốt hơn gpt-image-1 | Cao hơn |
| Nano Banana Pro | (Gemini Flash Image Pro) | 2K/4K, text rendering tốt | ~$0.09 |
| Grok Imagine | `/api/v1/grok/generate` | Image + short video | ~$0.10 |

---

## So sánh với Lovable AI (hiện tại)

| Tiêu chí | Lovable AI (hiện tại) | kie.ai (đề xuất) |
|----------|----------------------|-----------------|
| Model image | gemini-3-pro-image-preview, gemini-2.5-flash-image | Flux Kontext, GPT-Image-1, Grok + cả Gemini |
| Kiểu call | Synchronous (chat completions) | Asynchronous (taskId + poll) |
| Response time | ~15-40s (blocking) | ~15-40s (non-blocking với taskId) |
| Giá | Credit Lovable tính per-request | kie.ai credits, ~30-50% rẻ hơn |
| API Key | LOVABLE_API_KEY (tự động) | KIE_API_KEY (cần thêm) |
| Fallback | Tự động flash → pro | Tự xây dựng |

---

## Điểm khác biệt API quan trọng: Async vs Sync

**Kiến trúc hiện tại (Lovable AI - Sync):**
```text
Client → Edge Function → Lovable AI Gateway → [chờ ~30s] → response có ảnh
```

**kie.ai (Async - phải thay đổi luồng):**
```text
Client → Edge Function → kie.ai `/generate` → nhận taskId ngay
  → Poll `/record-info?taskId=xxx` mỗi 3s cho đến khi successFlag=1
  → Nhận resultImageUrl
```

Đây là **thay đổi kiến trúc lớn nhất** — cần thêm polling loop trong Edge Function hoặc dùng webhook callback.

---

## Phạm vi tích hợp đề xuất

### Phương án: Thêm kie.ai như provider thứ 3 song song Lovable AI

Không thay thế Lovable AI — chỉ thêm kie.ai là option bổ sung, để Admin chọn per-function:

```text
generate-brand-image:
  provider = "lovable"  → dùng gemini-3-pro-image-preview (hiện tại)
  provider = "kie"      → dùng flux-kontext-pro / gpt-image-1 (mới)
```

---

## Chi tiết kỹ thuật

### Bước 1: Thêm KIE_API_KEY vào Secrets

Admin cần thêm API key từ https://kie.ai/api-key vào Secrets của project.

### Bước 2: Thêm `kie` provider vào `MODELS_BY_TYPE` trong `useAIConfig.ts`

Thêm type mới `'image-kie'` và danh sách model:

```typescript
// Trong useAIConfig.ts
export const KIE_IMAGE_MODELS = [
  {
    id: 'flux-kontext-pro',
    name: 'Flux Kontext Pro',
    description: 'Text-to-image + editing, balanced quality',
    speed: 'medium',
    quality: 'high',
    cost: 'low',
    bestFor: ['Social media', 'Brand images', 'Editing'],
    provider: 'kie',
    endpoint: '/api/v1/flux/kontext/generate',
    pollEndpoint: '/api/v1/flux/kontext/record-info',
  },
  {
    id: 'flux-kontext-max',
    name: 'Flux Kontext Max',
    description: 'Complex scenes, highest Flux quality',
    speed: 'slow',
    quality: 'premium',
    cost: 'medium',
    bestFor: ['Complex compositions', 'High detail'],
    provider: 'kie',
    endpoint: '/api/v1/flux/kontext/generate',
    pollEndpoint: '/api/v1/flux/kontext/record-info',
  },
  {
    id: 'gpt-image-1',
    name: 'GPT-Image-1 (4o)',
    description: 'OpenAI, renders text & instructions precisely',
    speed: 'medium',
    quality: 'premium',
    cost: 'medium',
    bestFor: ['Text in image', 'Brand logos', 'Precise editing'],
    provider: 'kie',
    endpoint: '/api/v1/gpt4o-image/generate',
    pollEndpoint: '/api/v1/gpt4o-image/record-info',
  },
  {
    id: 'gpt-image-1.5',
    name: 'GPT-Image-1.5',
    description: 'Flagship mới nhất của OpenAI',
    speed: 'slow',
    quality: 'premium',
    cost: 'high',
    bestFor: ['Chất lượng cao nhất', 'Brand premium'],
    provider: 'kie',
    endpoint: '/api/v1/gpt4o-image/generate',
    pollEndpoint: '/api/v1/gpt4o-image/record-info',
  },
];
```

### Bước 3: Tạo shared helper `kie-image-generator.ts` trong `_shared/`

```typescript
// supabase/functions/_shared/kie-image-generator.ts

const KIE_BASE_URL = 'https://api.kie.ai';

export interface KieGenerateParams {
  prompt: string;
  model: string;        // 'flux-kontext-pro' | 'flux-kontext-max' | 'gpt-image-1' | ...
  aspectRatio?: string; // '1:1', '16:9', '9:16', '4:3', '3:4'
  outputFormat?: 'jpeg' | 'png';
  inputImage?: string;  // URL for image editing mode
  enableTranslation?: boolean;
  promptUpsampling?: boolean;
}

export interface KieTaskResult {
  taskId: string;
  imageUrl: string | null;
  status: 'generating' | 'success' | 'failed';
  errorMessage?: string;
}

// Step 1: Submit task → get taskId
async function submitKieTask(params: KieGenerateParams, apiKey: string): Promise<string>

// Step 2: Poll until done (max timeout 120s)
async function pollKieTask(taskId: string, model: string, apiKey: string): Promise<KieTaskResult>

// Main: generate image via kie.ai with polling
export async function generateImageViaKie(params: KieGenerateParams, apiKey: string): Promise<string>
```

Lý do tách ra `_shared/`: Cả `generate-brand-image` và `edit-image-background` đều có thể dùng kie.ai.

**Logic routing dựa trên model:**

```typescript
function getKieEndpoint(model: string): { generate: string; poll: string } {
  if (model.startsWith('flux-kontext')) {
    return {
      generate: '/api/v1/flux/kontext/generate',
      poll: '/api/v1/flux/kontext/record-info',
    };
  }
  if (model.startsWith('gpt-image')) {
    return {
      generate: '/api/v1/gpt4o-image/generate',
      poll: '/api/v1/gpt4o-image/record-info',
    };
  }
  // fallback
  return { generate: '/api/v1/flux/kontext/generate', poll: '/api/v1/flux/kontext/record-info' };
}
```

**Polling loop (tối đa 120 giây, poll mỗi 4 giây):**

```typescript
async function pollKieTask(taskId, model, apiKey) {
  const { poll } = getKieEndpoint(model);
  const maxAttempts = 30; // 30 × 4s = 120s timeout
  
  for (let i = 0; i < maxAttempts; i++) {
    await delay(4000);
    const res = await fetch(`${KIE_BASE_URL}${poll}?taskId=${taskId}`, {
      headers: { Authorization: `Bearer ${apiKey}` }
    });
    const data = await res.json();
    const item = data.data;
    
    if (item.successFlag === 1) {
      // Flux Kontext: item.response.resultImageUrl
      // GPT-Image-1: item.response.result_urls[0]
      return extractImageUrl(item.response, model);
    }
    if (item.successFlag === 2 || item.successFlag === 3) {
      throw new Error(item.errorMessage || 'KIE generation failed');
    }
    // successFlag === 0: still generating, continue
  }
  throw new Error('KIE generation timeout after 120s');
}
```

### Bước 4: Cập nhật `generate-brand-image/index.ts` để hỗ trợ kie.ai

Thêm logic phân luồng dựa trên model prefix từ `getAIConfig`:

```typescript
// Nếu model là kie model → dùng KIE API
// Nếu model là google/gemini → dùng Lovable AI (hiện tại)

const isKieModel = ['flux-kontext', 'gpt-image', 'grok-imagine'].some(
  prefix => aiConfig.model.startsWith(prefix)
);

if (isKieModel) {
  const kieApiKey = Deno.env.get('KIE_API_KEY');
  imageUrl = await generateImageViaKie({
    prompt: enhancedPrompt,
    model: aiConfig.model,
    aspectRatio: mapToKieAspectRatio(aspectRatio),
  }, kieApiKey);
} else {
  // Existing Lovable AI flow
  imageUrl = await generateImageWithRetry(enhancedPrompt, LOVABLE_API_KEY, { ... });
}
```

### Bước 5: Cập nhật `edit-image-background/index.ts` tương tự

Flux Kontext hỗ trợ **image editing** (chỉ cần thêm `inputImage` vào request):

```typescript
// Kie.ai Flux Kontext image editing
if (isKieModel) {
  imageUrl = await generateImageViaKie({
    prompt: editPrompt,
    model: aiConfig.model,
    inputImage: request.imageUrl,
    outputFormat: 'png',
  }, kieApiKey);
}
```

### Bước 6: Cập nhật Admin Panel - ModelSelector

Thêm `kie` provider vào `ModelSelector.tsx` với tab/section riêng:

```typescript
// MODELS_BY_TYPE trong useAIConfig.ts
image: [
  'google/gemini-3-pro-image-preview',    // Lovable AI (hiện tại)
  'google/gemini-2.5-flash-image',         // Lovable AI
  // KIE AI models (mới)
  'flux-kontext-pro',
  'flux-kontext-max', 
  'gpt-image-1',
  'gpt-image-1.5',
],
```

Thêm MODEL_INFO entries cho các kie models với `provider: 'kie'` để UI phân biệt được.

---

## Files cần thay đổi

| File | Thay đổi | Mức độ |
|------|----------|--------|
| `supabase/functions/_shared/kie-image-generator.ts` | TẠO MỚI — helper gọi kie.ai | Cao |
| `supabase/functions/generate-brand-image/index.ts` | Thêm kie routing | Trung bình |
| `supabase/functions/edit-image-background/index.ts` | Thêm kie routing | Trung bình |
| `src/hooks/useAIConfig.ts` | Thêm KIE_IMAGE_MODELS, MODEL_INFO entries, MODELS_BY_TYPE | Trung bình |
| `src/components/admin/ai/ModelSelector.tsx` | Thêm KIE provider section | Trung bình |
| `src/components/admin/ai/ModelCard.tsx` | Thêm badge KIE | Nhỏ |

---

## Thứ tự thực hiện

1. **Yêu cầu Admin thêm `KIE_API_KEY`** vào Secrets (lấy từ https://kie.ai/api-key)
2. Tạo `_shared/kie-image-generator.ts`
3. Cập nhật `generate-brand-image/index.ts` + `edit-image-background/index.ts`
4. Deploy Edge Functions
5. Cập nhật `useAIConfig.ts` với KIE models và MODEL_INFO
6. Cập nhật `ModelSelector.tsx` để Admin thấy và chọn được kie models
7. Test end-to-end: Admin chọn `flux-kontext-pro` → tạo ảnh

---

## Rủi ro và giải pháp

| Rủi ro | Giải pháp |
|--------|-----------|
| KIE timeout (>120s) | Fallback về Lovable AI Gemini Flash |
| KIE API key chưa thêm | Check `Deno.env.get('KIE_API_KEY')`, return 503 có message rõ ràng |
| kie.ai outage | `ai-config.ts` default model vẫn là Gemini → Admin có thể switch nhanh |
| Aspect ratio mapping khác | Flux Kontext dùng `1:1`, `16:9`, `9:16` — giống format hiện tại → map thẳng |
| GPT-Image-1 response format khác | `result_urls[0]` thay vì `resultImageUrl` → xử lý trong `extractImageUrl()` |

---

## Lưu ý quan trọng trước khi thực hiện

Để triển khai, Admin cần:
1. Tạo tài khoản tại https://kie.ai
2. Nạp credits (kie.ai trả phí riêng, không dùng Lovable credits)
3. Lấy API Key tại https://kie.ai/api-key
4. Thêm vào Secrets của project với tên `KIE_API_KEY`

Sau khi có API key, Admin vào `/admin/ai` → Functions → `generate-brand-image` → đổi model sang `flux-kontext-pro` là có hiệu lực ngay.
