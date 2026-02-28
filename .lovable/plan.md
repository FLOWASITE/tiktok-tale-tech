## Tối ưu tốc độ tạo Core Content

### Vấn đề

Quy trình hiện tại chạy **tuần tự** ~8 bước trước khi gọi AI, mỗi bước chờ bước trước xong mới bắt đầu. Tổng thời gian chờ không cần thiết ước tính 3-5 giây.

### Thay đổi

**File: `supabase/functions/generate-core-content/index.ts**`

#### 1. Song song hóa tất cả data fetching (tiết kiệm ~2-3s)

Gom các bước sau vào `Promise.allSettled` chạy đồng thời:

- Fetch AI config
- Fetch brand template
- Fetch personas
- Fetch products
- Fetch prompt registry
- Fetch smart context

Hiện tại (tuần tự):

```text
AI Config (200ms) -> Brand (300ms) -> Personas (200ms) -> Products (200ms) -> Smart Context (500ms)
Total: ~1400ms
```

Sau tối ưu (song song):

```text
[AI Config | Brand | Personas | Products | Smart Context] -> max(500ms)
Total: ~500ms
```

#### 2. Loại bỏ truy vấn brand_templates trùng lặp trong Knowledge Graph (tiết kiệm ~200ms)

Dòng 668-673 fetch `brand_templates.industry_template_id` nhưng dữ liệu này đã có từ bước fetch brand (dòng 544-548). Sẽ truyền `industry_template_id` trực tiếp thay vì query lại.

#### 3. Song song hóa Research + Knowledge Graph (tiết kiệm ~1-2s)

Research (Perplexity ~10s) và Knowledge Graph fetch hoàn toàn độc lập, có thể chạy cùng lúc.

#### 4. Giữ nguyên model (không đổi)

Model `qwen/qwen3.5-397b-a17b` do admin config quyết định, không thay đổi trong code.

### Kết quả dự kiến

- Giảm ~3-5 giây thời gian chờ trước khi AI bắt đầu generate
- Tổng thời gian giảm từ ~25-30s xuống ~20-25s
- Không thay đổi chất lượng output

### Chi tiết kỹ thuật

Cấu trúc code mới sẽ gom fetching thành 2 phase song song:

**Phase 1** - Tất cả DB queries + config (chạy đồng thời):

```typescript
const [aiConfigResult, brandResult, personasResult, productsResult, smartCtxResult] = 
  await Promise.allSettled([
    getAIConfig('generate-core-content', organizationId),
    brandTemplateId ? supabase.from('brand_templates').select('*').eq('id', brandTemplateId).single() : null,
    brandTemplateId ? supabase.from('customer_personas').select(...).eq('brand_template_id', brandTemplateId).limit(3) : null,
    brandTemplateId ? supabase.from('brand_products').select(...).eq('brand_template_id', brandTemplateId).eq('is_active', true).limit(3) : null,
    buildSmartContext(supabase, { ... }),
  ]);
```

**Phase 2** - Research + Knowledge Graph + Prompt Registry (song song, phụ thuộc Phase 1 cho brandContext):

```typescript
const [researchResult, kgResult, promptResult] = await Promise.allSettled([
  enableResearch ? performResearch({ topic, industry: brandContext?.industry, ... }) : null,
  fetchKnowledgeGraphContext(supabase, { topic, industryTemplateId: brandData?.industry_template_id, ... }),
  promptManager.get('system_prompt', promptVariables),
]);
```