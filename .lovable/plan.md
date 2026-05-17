# Auto AI chọn Social/Channel hợp lý

Mở rộng pattern Auto-AI (đã có ở Objectives) sang Step 2 "Kênh" của GoalWizard. AI sẽ phân tích brief + objectives + brand industry để gợi ý bộ kênh hợp lý + tần suất đăng cho từng kênh, user có thể override.

## 1. UX

Step 2 thêm toggle phía trên grid kênh:

```text
┌────────────────────────────────────────────────────────┐
│  ✨ Để AI tự chọn kênh hợp lý        [ Toggle  ⚪ ]    │
│  AI sẽ chọn kênh + tần suất dựa trên mục tiêu & brand  │
└────────────────────────────────────────────────────────┘
```

Khi bật:
- Loading 1-2s → các kênh AI chọn sẽ có badge ✨ + border accent + auto-tick
- Mỗi kênh AI chọn hiện tần suất gợi ý (vd: "AI: 3/tuần") thay vì default weekly
- Hiện 1 dòng lý do ngắn: *"Brand mỹ phẩm + mục tiêu Awareness → ưu tiên Instagram, Facebook, TikTok (visual-first)."*
- User vẫn click toggle off / bỏ chọn / thêm kênh khác bình thường — badge ✨ vẫn giữ ở kênh AI đã chọn để phân biệt

Khi tắt: về trạng thái thủ công, giữ những kênh user đã tick (không reset).

## 2. AI Logic (edge function `suggest-channels`)

Input:
- `title`, `description`, `objectives` (primary + secondary), `brand_template_id`, `organization_id`

AI làm:
1. Đọc brand industry, mục tiêu, mô tả
2. Map theo heuristic + LLM:
   - **Visual industry** (beauty, fashion, food, travel) → Instagram, Pinterest, TikTok, Facebook
   - **B2B / professional** (SaaS, consulting, finance) → LinkedIn, Website, Email, Medium
   - **Local service** (clinic, restaurant) → Facebook, Google Maps, Zalo OA
   - **Content/thought leadership** → Website/Blog, LinkedIn, Threads, Email
3. Map theo objective:
   - `awareness` → +social reach (FB, IG, TikTok-like)
   - `traffic` / `leads` → +long-form (website, blog, email)
   - `engagement` → +community (Threads, FB, IG)
   - `revenue` → +Shopify/website + retargeting channel
4. Trả về:
   ```json
   {
     "channels": [
       { "id": "instagram", "frequency": "3/week", "reason": "visual-first" },
       { "id": "facebook",  "frequency": "weekly", "reason": "broad reach" },
       { "id": "website",   "frequency": "weekly", "reason": "SEO long-form" }
     ],
     "reasoning": "Brand beauty + mục tiêu Awareness → ưu tiên kênh visual social."
   }
   ```

Fallback (khi LLM fail): rule-based theo industry keyword + objective, giống pattern `suggest-objectives`.

Giới hạn: tối đa 5 kênh để tránh dàn trải.

## 3. Frontend

`src/hooks/agents/useSuggestChannels.ts` — mirror `useSuggestObjectives`.

`GoalWizard.tsx`:
- Thêm state: `autoChannelMode`, `aiChannelIds: Set<string>`, `aiChannelReasoning: string`
- Khi toggle ON: gọi hook → set `selectedChannels`, `frequency`, lưu `aiChannelIds` để render badge ✨
- Khi user tick/untick: chỉ update `selectedChannels`, không xoá `aiChannelIds` (badge vẫn hiện để phân biệt)
- Step 2 render: badge ✨ + reasoning box (giống objectives auto mode)

## 4. Technical details

**Files mới:**
- `supabase/functions/suggest-channels/index.ts` — copy structure từ `suggest-objectives`
- `src/hooks/agents/useSuggestChannels.ts`

**Files sửa:**
- `src/components/agents/GoalWizard.tsx` — thêm toggle + state + render badge ở Step 2 (lines 1224-1255)

**Không đổi:**
- Schema DB, `agent_pipelines` table, generate-campaign-strategy
- Logic `estimatedPosts` (vẫn dùng `frequency` map, chỉ là AI fill sẵn giá trị)

**Pattern reuse:** giống hệt `suggest-objectives` (toggle + badge + reasoning + fallback heuristic), giảm code mới và đảm bảo UX nhất quán.

## 5. Out of scope

- Không tự động connect social account chưa kết nối (chỉ gợi ý ID, user vẫn cần connect ở Brand settings)
- Không thay đổi logic tính số bài (đã sửa ở turn trước)
- Không sửa Step 1 (chiến lược) hay Step 3 (tự động)
