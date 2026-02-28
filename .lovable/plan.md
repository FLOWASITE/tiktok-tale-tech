

## Tối ưu thêm tốc độ tạo Core Content

### Phân tích hiện trạng

Code đã được tối ưu Phase 1 (song song DB queries) và Phase 2 (song song Research + KG + Prompt). Các điểm nghẽn còn lại:

### Thay đổi đề xuất

#### 1. Song song hóa Auth verification + Phase 1 (tiết kiệm ~200-400ms)

Hiện tại auth check (getUser + org membership) chạy tuần tự **trước** Phase 1. Có thể gom auth vào chạy song song với Phase 1 vì chúng độc lập.

**File: `supabase/functions/generate-core-content/index.ts`**

Gom `supabase.auth.getUser()` và `organization_members` check vào `Promise.allSettled` cùng Phase 1.

#### 2. Song song hóa bên trong Knowledge Graph fetcher (tiết kiệm ~300-500ms)

**File: `supabase/functions/_shared/data-fetchers/knowledge-graph-fetcher.ts`**

Hiện tại KG fetcher chạy 3 bước tuần tự:
```text
Find industry node (150ms) -> Generate embedding + Semantic search (200ms) -> Get connected nodes (150ms)
```

Bước 1 (find industry node) và bước 2 (generate embedding + semantic search) hoàn toàn độc lập, chạy song song được:
```text
[Find industry node | Generate embedding + Semantic search] -> Get connected nodes
```

#### 3. Song song hóa post-generation (tiết kiệm ~200-300ms)

**File: `supabase/functions/generate-core-content/index.ts`**

Sau khi AI tạo xong nội dung, hiện tại chạy tuần tự:
```text
Quality Gate -> DB Insert -> Save Metrics
```

DB Insert và Save Metrics độc lập, có thể song song:
```text
Quality Gate -> [DB Insert | Save Metrics] (song song)
```

#### 4. Skip KG khi không có industry template (tiết kiệm ~200ms)

Nếu không có `industryTemplateId`, KG fetcher vẫn gọi embedding + semantic search nhưng thường trả về kết quả rỗng. Thêm early-return khi không có `industryTemplateId` và topic quá chung.

### Chi tiết kỹ thuật

**knowledge-graph-fetcher.ts - Song song hóa nội bộ:**
```typescript
// Before: sequential
const primaryIndustry = await findIndustryNode();
const semanticResults = await semanticSearch();
const connectedNodes = await getConnected(primaryIndustry);

// After: parallel step 1+2, then step 3
const [industryResult, semanticResult] = await Promise.allSettled([
  findIndustryNode(),
  semanticSearch(),
]);
// Step 3 depends on step 1
const connectedNodes = primaryIndustry 
  ? await getConnected(primaryIndustry) 
  : [];
```

**index.ts - Song song auth + Phase 1:**
```typescript
const [authResult, ...phase1Results] = await Promise.allSettled([
  resolveAuth(supabase, authHeader, bodyUserId, orgId),
  getAIConfig(...),
  brandTemplateId ? supabase.from('brand_templates')... : ...,
  // ... other Phase 1 queries
]);
```

**index.ts - Song song post-generation:**
```typescript
const [insertResult, _metricsResult] = await Promise.allSettled([
  supabase.from('core_contents').insert({...}).select('id').single(),
  saveMetrics(supabase, {...}),
]);
```

### Kết quả dự kiến
- Giảm thêm ~700ms-1.2s thời gian pre/post generation
- Tổng cộng với tối ưu trước: giảm ~4-6s so với code gốc
- Không ảnh hưởng chất lượng output

