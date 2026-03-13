

## Vấn đề: Content Node dùng sai model vì `functionName` không khớp cấu hình

### Nguyên nhân gốc

Trong graph engine, các node gọi `callAI()` với `functionName` không khớp với key trong bảng `ai_function_configs`:

| Node | functionName gọi | Key cần khớp (DB/Default) | Model thực tế |
|------|-------------------|---------------------------|----------------|
| Content Node | `content_node` | ❌ không tồn tại | fallback → `google/gemini-2.5-flash` |
| Research Node | `research_node` | ❌ không tồn tại | fallback → `google/gemini-2.5-flash` |

Trong khi đó, bạn đã cấu hình trong Admin:
- `generate-core-content` → `qwen/qwen3.5-397b-a17b`
- `generate-multichannel` → `anthropic/claude-sonnet-4.5`

**Kết quả**: LLM điều phối (chọn tool) dùng `gemini-2.5-flash` thay vì model bạn cài đặt. Tuy nhiên, các edge function thực tế tạo content (`generate-core-content`, `generate-multichannel`) vẫn đọc đúng config từ DB.

### Giải pháp

**1. Thêm `content_node` và `research_node` vào `DEFAULT_CONFIGS`** trong `ai-config.ts`:
- `content_node` → map sang cùng default với `content-agent` (`google/gemini-2.5-flash`)
- `research_node` → map sang `research-agent`
- Hoặc tốt hơn: sửa `functionName` trong các node để dùng đúng key đã có (`content-agent`, `research-agent`)

**2. Sửa `functionName` trong graph nodes** để khớp với key đã tồn tại:
- `content-node.ts`: đổi `functionName: 'content_node'` → `'content-agent'`
- `research-node.ts`: đổi `functionName: 'research_node'` → `'research-agent'`

Cách này đảm bảo khi bạn thay đổi model cho `content-agent` trong Admin, graph engine cũng sẽ dùng đúng model đó.

**3. Thêm entry `content-agent` vào bảng `ai_function_configs`** nếu bạn muốn override model cho phần điều phối (chọn tool) riêng.

### Files cần sửa
- `supabase/functions/_shared/graph/nodes/content-node.ts` — đổi functionName
- `supabase/functions/_shared/graph/nodes/research-node.ts` — đổi functionName

