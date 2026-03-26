

# Agent Model Configuration — AI Management Tab

## Tổng quan
Thêm tab **"Agents"** vào trang AI Management (`/admin/ai`) cho phép admin cấu hình model AI cho từng Agent/Stage trong pipeline 6 giai đoạn (Strategy, Create, Quality, Approval, Publish, Analyze).

## Hiện trạng
- Pipeline 6 stage gọi các edge functions (`topic-ai`, `agent-creator-v2`, `agent-quality`, v.v.) — mỗi function dùng model mặc định hardcoded hoặc từ `ai_function_configs`
- `AgentConfig` interface có `defaultModel` nhưng chưa có UI quản lý riêng cho Agents
- Đã có `ai_function_configs` table và `ai_channel_model_configs` table — pattern tương tự

## Giải pháp

### 1. Database — Tạo bảng `ai_agent_model_configs`

```sql
CREATE TABLE public.ai_agent_model_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  agent_name TEXT NOT NULL, -- 'strategy', 'create', 'quality', 'approval', 'publish', 'analyze'
  model_override TEXT,
  temperature NUMERIC DEFAULT 0.7,
  max_tokens INTEGER,
  is_enabled BOOLEAN DEFAULT true,
  quality_mode TEXT DEFAULT 'balanced', -- 'fast', 'balanced', 'quality'
  fallback_model TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(organization_id, agent_name)
);

ALTER TABLE public.ai_agent_model_configs ENABLE ROW LEVEL SECURITY;

-- RLS: org admins can manage
CREATE POLICY "Org admins manage agent configs"
  ON public.ai_agent_model_configs FOR ALL TO authenticated
  USING (public.is_org_admin(auth.uid(), organization_id));
```

### 2. Frontend — Hook `useAgentModelConfig`

File: `src/hooks/useAgentModelConfig.ts`

- Pattern giống `useChannelModelConfig` — CRUD operations cho `ai_agent_model_configs`
- Định nghĩa 6 agents với metadata (name, description, icon, default model, recommended models)
- Export `ALL_AGENTS` constant

### 3. Frontend — Component `AIAgentModelConfig`

File: `src/components/admin/ai/AIAgentModelConfig.tsx`

- Grid 6 cards, mỗi card đại diện 1 agent stage
- Mỗi card hiển thị: tên agent, icon, model hiện tại, temperature slider, quality mode selector
- Click card → Dialog chỉnh sửa chi tiết (model selector, temperature, max tokens, fallback model)
- Tái sử dụng `ModelSelector` component đã có
- Badge trạng thái: enabled/disabled, custom/default

### 4. Thêm tab "Agents" vào AdminAIManagement

File: `src/pages/AdminAIManagement.tsx`

- Thêm tab thứ 9 "Agents" với icon `Bot`
- Render `<AIAgentModelConfig />`

### 5. Backend — Đọc config trong pipeline

File: `supabase/functions/agent-pipeline/index.ts`

- Thêm helper `getAgentModelConfig(supabase, orgId, agentName)` query `ai_agent_model_configs`
- Trước khi gọi mỗi stage function, lookup config và truyền `model_override` vào body
- Fallback về model mặc định nếu không có config

## Kết quả
- Admin có thể chọn model riêng cho từng Agent stage (ví dụ: Strategy dùng Gemini Flash giá rẻ, Create dùng GPT-5 chất lượng cao, Quality dùng model reasoning)
- Hỗ trợ fallback model khi model chính lỗi
- Cấu hình per-organization

