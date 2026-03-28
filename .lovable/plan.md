

# Thêm Group Model Override cho AI Functions

## Tổng quan
Thêm khả năng đặt 1 model mặc định cho toàn bộ functions trong một nhóm type (text, image, search). Khi function cụ thể có `modelOverride` riêng thì dùng cái riêng, không thì dùng group default.

## Cách tiếp cận

### 1. Database — Bảng `ai_function_group_configs`
Tạo bảng mới lưu group-level model override:

```sql
CREATE TABLE public.ai_function_group_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id),
  function_type TEXT NOT NULL, -- 'text', 'image', 'search'
  model_override TEXT,
  force_provider TEXT,
  temperature NUMERIC,
  is_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(organization_id, function_type)
);

ALTER TABLE ai_function_group_configs ENABLE ROW LEVEL SECURITY;
-- RLS: admin read/write
```

### 2. Hook — Thêm logic group config vào `useAIConfig.ts`
- Thêm query fetch `ai_function_group_configs`
- Thêm mutation upsert group config
- Export helper `getEffectiveModel(functionName)`: function override > group override > hardcoded default

### 3. UI — Thêm Group Model Selector vào `FunctionCategoryGroup.tsx`
- Trong header của mỗi category group, thêm nút "Set model cho nhóm" (chỉ hiện cho type-based groups)
- Hiển thị badge "Group: qwen-plus" khi group có override
- Trên `FunctionCard`, hiển thị nguồn model: "Group default" vs "Custom override"

### 4. UI — Thêm Group Config Panel vào `AIFunctionConfig.tsx`
- Thêm 1 section phía trên danh sách functions: **"Group Defaults"** với 3 cards (Text, Image, Search)
- Mỗi card có ModelSelector để chọn model mặc định cho group
- Hiển thị số functions sẽ bị ảnh hưởng (trừ những function đã có override riêng)

### Flow ưu tiên model
```text
Function có modelOverride riêng? → Dùng nó
  ↓ Không
Group type có model_override? → Dùng nó  
  ↓ Không
Dùng hardcoded currentModel trong AI_FUNCTIONS
```

### Files thay đổi
- **Migration SQL**: Tạo bảng `ai_function_group_configs` + RLS
- **`src/hooks/useAIConfig.ts`**: Thêm query/mutation cho group configs, helper `getEffectiveModel`
- **`src/components/admin/ai/FunctionCategoryGroup.tsx`**: Thêm group model selector trong header
- **`src/components/admin/ai/AIFunctionConfig.tsx`**: Thêm Group Defaults section, truyền group config xuống FunctionCategoryGroup
- **`src/components/admin/ai/FunctionCard.tsx`**: Hiển thị badge nguồn model (group/custom)

