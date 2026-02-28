

## Fix: `brandData is not defined` trong generate-core-content

### Vấn đề

Khi refactor song song hóa Phase 1, code đã gom tất cả DB queries vào `Promise.allSettled` nhưng **quên extract kết quả** từ các settled promises. Cụ thể:

- `brandData`, `brandContext`, `personas`, `products`, `smartContextInjection` - không được extract từ Phase 1 results
- `model`, `maxTokens` - không được tính từ `aiConfig` và `lengthMode`  
- `taskId` - thiếu trong destructuring body

### File cần sửa

**`supabase/functions/generate-core-content/index.ts`**

#### 1. Thêm `taskId` vào destructuring body (line 446-450)

```typescript
const {
  topic, contentGoal, contentAngle, contentRole, lengthMode,
  brandTemplateId, targetAudience, additionalContext, topicHistoryId,
  stream, enableResearch, researchRecency, taskId,  // <-- thêm taskId
} = body;
```

#### 2. Thêm extraction Phase 1 results (sau line 544, trước Phase 2)

Sau khi extract `userId` từ `authResult`, cần extract tất cả kết quả khác:

```typescript
// --- Extract AI Config ---
const aiConfig = aiConfigResult.status === 'fulfilled' ? aiConfigResult.value : null;

// --- Extract Brand Data ---
const brandData = brandResult.status === 'fulfilled' ? brandResult.value?.data : null;
const brandContext: BrandContext | null = brandData ? {
  brand_name: brandData.brand_name,
  industry: brandData.industry,
  brand_voice: brandData.brand_voice,
  target_audience: brandData.target_audience,
  unique_selling_points: brandData.unique_selling_points,
  content_pillars: brandData.content_pillars,
  competitors: brandData.competitors,
  brand_values: brandData.brand_values,
  communication_style: brandData.communication_style,
} : null;

// --- Extract Personas ---
const personas = personasResult.status === 'fulfilled' ? (personasResult.value?.data || []) : [];

// --- Extract Products ---
const products = productsResult.status === 'fulfilled' ? (productsResult.value?.data || []) : [];

// --- Extract Smart Context ---
const smartCtx = smartCtxResult.status === 'fulfilled' ? smartCtxResult.value : null;
const smartContextInjection = smartCtx?.contextInjection || '';

// --- Derive model & maxTokens ---
const model = aiConfig?.model || getDefaultModel(lengthMode as CoreContentLengthMode);
const maxTokens = getMaxTokens(lengthMode as CoreContentLengthMode);
```

### Tổng kết

Chỉ sửa 1 file, thêm ~25 dòng extraction code giữa Phase 1 và Phase 2. Không thay đổi logic, chỉ khôi phục các biến bị mất khi refactor.

