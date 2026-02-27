

## Cập nhật Orchestrator hiểu quy trình 4 bước tạo nội dung đa kênh

### Vấn đề hiện tại
Orchestrator (system prompt cho LLM) và Content Agent chỉ mô tả quy trình ở mức cao ("research → content → review"), chưa hiểu rõ quy trình 4 bước chi tiết của Wizard: **Topic → Core Content → Content Role → Multi-channel Transform**. Điều này dẫn đến việc Agent có thể bỏ qua các bước quan trọng hoặc chọn tham số không phù hợp.

### Thay đổi

#### 1. Cập nhật `ORCHESTRATOR_SYSTEM_PROMPT` trong `orchestrator.ts`

Thêm section mô tả quy trình 4 bước vào system prompt của Orchestrator LLM, giúp nó hiểu:
- **Bước 1 (Topic)**: Cần Content Goal (5 loại) + Topic (min 10 ky tu). Nếu không có topic → bắt buộc chạy Research node
- **Bước 2 (Core Content)**: Content Angle (6 loại) + Length Mode. Research node cung cấp dữ liệu cho bước này
- **Bước 3 (Content Role)**: Seed/Sprout/Harvest - phải nhất quán với Goal/Angle
- **Bước 4 (Multi-channel)**: Transform Core Content sang N kênh với Journey Stage

Orchestrator sẽ biết rằng khi user yêu cầu "tạo content", toàn bộ 4 bước này phải được thực hiện bởi Content node (thông qua tool `generate_multichannel` nội bộ tự gọi cả Core Content lẫn Transform).

#### 2. Cập nhật Content Agent prompt trong `content-agent.ts`

Bổ sung mô tả chi tiết quy trình 4 bước vào system prompt, bao gồm:
- Mapping giữa Content Goal → Content Angle gợi ý
- Mapping giữa Goal/Angle → Content Role gợi ý (seed/sprout/harvest)
- Logic chọn Journey Stage phù hợp
- Danh sách 12 kênh hỗ trợ
- Quy tắc xung đột chiến lược (VD: goal "conversion" + role "seed" = conflict)

#### 3. Cập nhật `NODE_DESCRIPTIONS` trong `orchestrator.ts`

Mô tả rõ hơn node `content` bao gồm pipeline nội bộ: Core Content → Role Assignment → Channel Transform.

### Chi tiết kỹ thuật

**File cần sửa:**
- `supabase/functions/_shared/graph/orchestrator.ts` — Cập nhật `ORCHESTRATOR_SYSTEM_PROMPT` và `NODE_DESCRIPTIONS`
- `supabase/functions/_shared/agents/content-agent.ts` — Bổ sung mapping chiến lược vào `buildContentSystemPrompt`

**Không thay đổi logic code** — chỉ cập nhật prompt/instruction để Agent hiểu đúng quy trình. Tool executor (`executeGenerateMultichannel`) đã tự động xử lý pipeline 2 bước (Core Content → Transform), chỉ cần Agent truyền đúng tham số.

**Nội dung chính thêm vào Orchestrator prompt:**

```text
Content Creation Pipeline (4-step process):
1. Topic Selection: User provides Content Goal + Topic. If no topic → MUST run "research" node first
2. Core Content: Generate base content using topic + Content Angle + Length Mode  
3. Content Role: Assign strategic role (seed/sprout/harvest) based on Goal/Angle
4. Multi-channel Transform: Convert Core Content to platform-specific posts

The "content" node handles steps 2-4 internally via generate_multichannel tool.
The "research" node handles step 1 (topic discovery) when user has no specific topic.
```

**Nội dung chính thêm vào Content Agent prompt:**

```text
Strategy Mapping (để tự chọn tham số chính xác):
- Goal "education" → Angle "educational" → Role "sprout"
- Goal "awareness" → Angle "storytelling"/"behind_the_scenes" → Role "seed"  
- Goal "engagement" → Angle "qa_faq"/"entertaining" → Role "sprout"
- Goal "conversion" → Angle "promotional" → Role "harvest"
- Goal "expertise" → Angle "educational"/"social_proof" → Role "sprout"

Conflict Rules:
- Goal "conversion" + Role "seed" = CONFLICT → prefer "harvest"
- Goal "awareness" + Role "harvest" = CONFLICT → prefer "seed"
```

