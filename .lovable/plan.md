## Chẩn đoán

Job gần nhất (`Công ty TNHH Tư vấn Kiểm toán TAF`, brand `188f65cc...`) chỉ trả **5 keyword** dù `limit=150`, expanded seeds bị **mojibake** (`"c�ng ty tnhh tư vấn kiểm to�n taf"`), và **0 keyword được lưu** vào pool. Brand DNA cho TAF gần như trống — không pillars, không industry, không evergreen, không social → AI thiếu context để sinh keyword chất lượng.

### 4 root causes

**1. Brand thiếu DNA → seed quá nghèo**
- TAF brand: `industry=null`, `content_pillars=[]`, `evergreen_themes=null`, không social connection.
- Smart seed derivation rơi hết vào nhánh `if (seeds.length < 3)` nhưng `ind=""` → tất cả `push(\`${ind} là gì\`)` cho ra `" là gì"` rỗng → cuối cùng seed duy nhất = brand name.
- AI chỉ thấy 1 seed brand-name → sinh 5 biến thể loanh quanh tên brand (`taf tuyển dụng`, `taf tư vấn thành lập`...) – không phải keyword SEO thực sự.

**2. Seed expander corrupt UTF-8**
- `expandedSeeds` log ra `"c�ng ty tnhh tư vấn kiểm to�n taf"` → `expandSeeds()` trong `_shared/seed-expander.ts` đang gọi Google Suggest/Firecrawl với encoding sai (latin-1?) → AI nhận seed hỏng, càng off-topic.

**3. Tool-loop không lặp đủ — chỉ trả 5 keyword khi limit 150**
- Prompt nói "Gọi tool nhiều lần cho đến khi đủ ${limit}" nhưng implementation chỉ gọi AI **1 lần** rồi gom hết tool_calls. Model `qwen-plus` (group override) thường chỉ trả 1 batch 5 cái rồi dừng.
- Cần loop multi-turn: feed lại tool result → ép AI tiếp tục cho đến khi đủ limit hoặc max 6 vòng.

**4. Insert constraint violation → "0 inserted" dù mode deep**
- Log: `seo_keywords_source_check` reject `source: "ai_research_deep"`. Constraint chỉ allow tập cũ (`manual`, `ai_research`, `import`...). User thấy keyword preview nhưng pool không nhận.

---

## Kế hoạch sửa

### A. Edge function `keyword-research-v2`

**A1. Smart seed derivation cứng cáp hơn**
- Khi brand không có industry/pillars → fallback dùng **brand name + chunk noun-phrases từ USP/positioning/mission** (TAF có USP rất giàu: "kiểm toán", "chính trực", "độc lập", "chuẩn mực nghề nghiệp"...).
- Thêm helper `extractSeedsFromText()` tái sử dụng `extractTerms()` (đã có) để lấy 3-5 cụm 2-3 từ từ USP+positioning+mission làm seed.
- Bỏ nhánh `${ind} là gì` khi `ind` rỗng (đang sinh seed `" là gì"` invalid).
- Skip seeds < 2 ký tự thực (sau trim).

**A2. Multi-turn tool loop để đạt đủ limit**
- Wrap `tryCall` thành loop tối đa 6 vòng, mỗi vòng:
  - Append `assistant` message với tool_calls + `tool` message với `{"ack":true,"received":N,"need_more":limit-collected}`
  - Yêu cầu "tiếp tục sinh keyword đa dạng, KHÔNG lặp các keyword đã gửi: [list]"
  - Dừng khi đủ `limit` hoặc model không call tool nữa.
- Dedupe theo `keyword.toLowerCase().trim()` cuối loop.

**A3. Sửa seed expander encoding**
- Đọc `_shared/seed-expander.ts` → đảm bảo `encodeURIComponent(seed)` thay cho concat trực tiếp (90% là vấn đề ở đây).
- Validate kết quả: nếu chứa `\uFFFD` (replacement char) → bỏ.

**A4. Sửa source value để không vi phạm check constraint**
- Đổi `source: "ai_research_deep"` → `"ai_research"` (giá trị đã tồn tại) **HOẶC** tạo migration mở rộng constraint thêm `'ai_research_deep'`.
- Khuyến nghị: dùng `"ai_research"` + thêm column metadata `source_detail='deep'` hoặc gắn vào `tags` — không cần migration.

### B. Frontend `KeywordResearchLabTab.tsx`

**B1. Cảnh báo khi brand thiếu DNA**
- Nếu brand được chọn nhưng `industry` trống và `content_pillars` rỗng → hiện **inline alert vàng** trong panel "Brand DNA" với CTA "Bổ sung thông tin brand" (link đến Brand settings) trước khi bấm Research.
- Vẫn cho chạy nhưng cảnh báo "Kết quả sẽ kém chính xác".

**B2. Hiển thị thông báo khi có 0 keyword được lưu**
- Khi `done.inserted === 0` mà `total > 0` ở mode deep → toast warning "Không lưu được keyword vào pool" (giúp user thấy bug constraint nếu còn).

### C. Memory update
- Cập nhật `mem://features/seo/research-lab-v2-vn.md`: bổ sung note (1) tool-loop multi-turn để hit limit, (2) source value chuẩn, (3) seed fallback từ USP khi brand DNA trống.

---

## Files thay đổi

- `supabase/functions/keyword-research-v2/index.ts` (smart seeds, tool loop, source value)
- `supabase/functions/_shared/seed-expander.ts` (fix UTF-8 encoding)
- `src/components/admin/seo-keywords/KeywordResearchLabTab.tsx` (alert brand thiếu DNA + toast 0 inserted)
- `.lovable/memory/features/seo/research-lab-v2-vn.md`

## Không cần migration
Dùng `source="ai_research"` (đã hợp lệ) thay vì mở rộng constraint.

## Edge case
- Brand có DNA đầy đủ → behavior cũ giữ nguyên, chỉ thêm tool-loop (tăng số keyword về đúng `limit`).
- Seed expander fail toàn bộ → vẫn chạy với seeds gốc (đã có try/catch sẵn).
