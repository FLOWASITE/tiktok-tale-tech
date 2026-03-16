

# Fix: AI Channel Model Config không lưu được

## Nguyên nhân gốc

Ở `src/hooks/useChannelModelConfig.ts` dòng 98-103, khi tìm record hiện tại để quyết định INSERT hay UPDATE:

```typescript
const { data: existingData } = await supabase
  .from('ai_channel_model_configs')
  .select('id')
  .eq('channel', config.channel)
  .eq(organizationId ? 'organization_id' : 'organization_id', organizationId || null)
  .maybeSingle();
```

Vấn đề: `.eq('organization_id', null)` **không hoạt động** trong PostgREST — phải dùng `.is('organization_id', null)` để so sánh với NULL. Kết quả:
- Luôn trả về `null` → luôn chọn INSERT
- INSERT trùng → vi phạm unique constraint `ai_channel_model_configs_global_unique`
- Lưu thất bại

Ngoài ra, component `AIChannelModelConfig` được gọi **không có** `organizationId` prop (dòng 94 AdminAIManagement.tsx), nên `organizationId` luôn là `undefined`.

## Cách sửa

**File: `src/hooks/useChannelModelConfig.ts`** — Sửa upsert mutation (dòng 96-136):

Thay thế logic tìm existing record:

```typescript
// Cũ (lỗi):
.eq(organizationId ? 'organization_id' : 'organization_id', organizationId || null)

// Mới (đúng):
let findQuery = supabase
  .from('ai_channel_model_configs')
  .select('id')
  .eq('channel', config.channel);

if (organizationId) {
  findQuery = findQuery.eq('organization_id', organizationId);
} else {
  findQuery = findQuery.is('organization_id', null);
}

const { data: existingData } = await findQuery.maybeSingle();
```

Chỉ sửa 1 file, ~5 dòng thay đổi. Không cần migration.

