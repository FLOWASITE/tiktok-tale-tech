# Xử lý tên Campaign vô nghĩa hoặc lệch chủ đề

## Vấn đề hiện tại

Trong `GoalWizard.tsx` + `clarify-campaign-intent`, fast-path "ready: true" được kích hoạt chỉ cần có objective + (key_messages|pillars) + (title>15 ký tự HOẶC description>20 ký tự). Nó **không kiểm tra ngữ nghĩa** của tên:

- Tên kiểu `"asdf asdf asdf asdf"`, `"test campaign 123"`, `"aaaaaaaaaaaaaaaa"` → vẫn pass vì >15 ký tự.
- Tên `"Khuyến mãi mùa hè"` nhưng description nói về `"Webinar B2B AI"` → AI vẫn chạy với tên lệch, output bị nhiễu.
- Kết quả: AI sinh content lệch hướng, user phải sửa lại từ đầu.

## Phạm vi

Chỉ frontend UX + edge function `clarify-campaign-intent`. Không đụng schema, không đụng pipeline generation.

## Giải pháp

### 1. Client-side heuristic (rẻ, chạy trước khi gọi AI)

Trong `GoalWizard.tsx`, thêm hàm `analyzeCampaignName(name, description, brand, objectives)`:

**Phát hiện tên vô nghĩa (gibberish):**
- Lặp ký tự ≥4 lần liên tiếp (`aaaa`, `xxxx`)
- Tỷ lệ ký tự non-alpha >40% (loại số/symbol thuần)
- Toàn bộ là 1 từ lặp lại (`test test test`)
- Match blacklist: `test`, `asdf`, `qwerty`, `untitled`, `campaign 1/2/3`, `new campaign`, `chiến dịch mới`
- Không chứa ký tự có nghĩa tiếng Việt/Anh (regex Unicode letters <5)

**Phát hiện tên quá generic:**
- Chỉ chứa từ chung chung: `"chiến dịch"`, `"campaign"`, `"marketing"`, `"quảng cáo"` mà không có danh từ riêng/sản phẩm/thời gian
- Độ dài <8 ký tự sau khi trim stopwords

→ Trả về `{ status: 'gibberish' | 'generic' | 'ok', reason }`.

### 2. Server-side semantic check (AI, chỉ khi heuristic chưa chắc)

Mở rộng `clarify-campaign-intent/index.ts`:

- Thêm field `name_quality` vào prompt: yêu cầu AI đánh giá tên có ý nghĩa không, có liên quan tới description/brand/industry/objective không.
- Nếu AI thấy lệch → trả về schema mới:
  ```json
  {
    "ready": false,
    "name_issue": "irrelevant" | "vague" | "gibberish",
    "name_issue_reason": "Tên 'Khuyến mãi mùa hè' không khớp với mô tả về webinar B2B AI",
    "suggested_names": ["Webinar AI cho doanh nghiệp B2B Q2", "Hội thảo AI dành cho leader B2B", "Bứt phá B2B với AI – Webinar tháng 6"]
  }
  ```
- Sửa fast-path (line 72): chỉ skip AI khi heuristic `status === 'ok'`. Nếu không, **bắt buộc** chạy AI để gợi ý tên.

### 3. UX mới: CampaignNameQualityAlert

Component nhỏ trong `GoalWizard.tsx` (chèn dưới Input tên, trước Description):

- Khi `analyzeCampaignName()` trả `gibberish`/`generic`: hiển thị banner amber inline ngay khi user blur input:
  > "Tên chiến dịch chưa rõ nghĩa. AI sẽ khó hiểu mục tiêu — nên đặt cụ thể hơn (sản phẩm, đối tượng, thời điểm)."
  - Nút **"Đề xuất tên với AI"** → gọi `clarify-campaign-intent` với flag `mode: 'suggest_name_only'` → hiện 3 chip tên gợi ý, click để áp dụng.

- Khi response từ `handleConfirmStep()` có `name_issue`: thay vì hiện `ClarificationStep` thông thường, hiện `NameSuggestionStep` (variant mới):
  - Tiêu đề: "Tên hiện tại có vẻ lệch khỏi mô tả"
  - Lý do AI đưa ra (`name_issue_reason`)
  - 3 chip `suggested_names` để chọn 1-click → setName + finalSubmit ngay
  - Nút secondary "Giữ tên hiện tại, vẫn chạy" → finalSubmit với name cũ
  - Nút ghost "Quay lại sửa tay"

### 4. Validate cứng ở `canNext()`

Step 0 hiện chỉ check `name.trim().length > 0`. Đổi thành: vẫn cho qua, nhưng nếu `gibberish` thì disable nút "AI tự chạy toàn bộ" trong action zone và hiện tooltip "Đặt tên rõ hơn để AI hiểu đúng".

## Files sẽ chỉnh

```text
src/components/agents/GoalWizard.tsx
  + analyzeCampaignName() helper (~30 dòng)
  + CampaignNameQualityAlert component (~40 dòng)
  + NameSuggestionStep component (~50 dòng) – tái sử dụng style của ClarificationStep
  ~ handleConfirmStep(): xử lý response name_issue trước khi xử lý questions
  ~ canNext()/auto-mode button: disable khi gibberish
  ~ fast-path local (line 743): thêm điều kiện !isGibberish

supabase/functions/clarify-campaign-intent/index.ts
  ~ prompt: thêm 2 nhiệm vụ (đánh giá name_quality, gợi ý 3 tên nếu cần)
  ~ schema response: thêm name_issue, name_issue_reason, suggested_names
  ~ fast-path (line 72): vẫn giữ, nhưng chỉ pass khi title đủ ngữ nghĩa (>=2 từ có nghĩa, không match blacklist server-side)
  + helper isLikelyGibberish() đồng bộ với client
```

## Không làm

- Không thay đổi pipeline `agent-pipeline`, `generate-campaign-strategy`, `generate-multichannel`.
- Không bắt buộc user phải đổi tên — luôn có lối "Giữ tên hiện tại" để không cản trở workflow.
- Không lưu lịch sử tên bị reject (out of scope).

## Edge cases

- Tên hợp lệ nhưng ngôn ngữ hiếm (vd: tiếng Thái) → heuristic dựa trên Unicode letter category, không hard-code charset Latin/Vietnamese.
- User đang ở chế độ "AI tự chạy toàn bộ" (auto mode): vẫn chạy heuristic trước; nếu gibberish → auto-pilot dừng và bật `NameSuggestionStep` thay vì gọi pipeline.
- Response AI fail/timeout → fallback im lặng, không block user (giữ behavior hiện tại của catch block line 779).
