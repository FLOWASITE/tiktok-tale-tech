

## Nâng cấp Prompt AI cho Multichannel — Áp dụng chung cho MỌI brand/ngành

### Câu hỏi của bạn
> "Brand khác không liên quan đến thuế thì xử lý như thế nào?"

**Trả lời ngắn:** Hệ thống Flowa đã được thiết kế **hoàn toàn generic** — mọi thay đổi sẽ áp dụng cho TẤT CẢ brand/ngành, không riêng thuế. 11 điểm editorial (tiêu đề thu hút, CTA mạnh, câu chuyện thực tế, 450-700 từ...) sẽ được encode thành **quy tắc chung trong prompt AI**, và hệ thống sẽ tự điều chỉnh nội dung theo:
- **Industry Memory** của brand (thuế, thẩm mỹ, bất động sản, F&B...)
- **Brand Voice** (tone, formality, preferred words)
- **Content Goal + Angle + Role** (education, conversion, storytelling...)
- **Channel Settings** (Facebook 450-700 từ, Instagram 50-150 từ...)

### Kế hoạch thay đổi

#### 1. Nâng cấp `DEFAULT_CHANNEL_SETTINGS` — Tăng word count per channel
**File:** `supabase/functions/generate-multichannel/index.ts`

Thay đổi `min_length` / `max_length` cho các kênh cần nội dung dài hơn:

| Channel | Hiện tại | Sau thay đổi | Lý do |
|---------|----------|-------------|-------|
| Facebook | 120-300 words | **250-500 words** | Đủ cho cấu trúc 8-10 phần (tiêu đề, giới thiệu, CTA...) |
| LinkedIn | 150-400 words | **300-600 words** | Nội dung chuyên sâu cần depth |
| Email | 150-400 words | **250-500 words** | Cần đủ sections cho conversion |
| YouTube | 500-800 words | giữ nguyên | Đã đủ |
| Telegram | 100-500 words | **200-500 words** | Tăng min |

Các kênh ngắn (Instagram, Twitter, TikTok, Threads, Zalo OA, Google Maps) **giữ nguyên** — không phù hợp long-form.

#### 2. Nâng cấp System Prompt — Thêm Editorial Structure Template
**File:** `supabase/functions/generate-multichannel/index.ts` (hàm `getSystemPrompt`)

Thêm section mới trong system prompt áp dụng cho **tất cả brand**:

```text
## CẤU TRÚC NỘI DUNG CHUẨN (Áp dụng cho kênh long-form: Facebook, LinkedIn, Email, Website)

BÀI VIẾT PHẢI CÓ ĐỦ CÁC THÀNH PHẦN SAU (điều chỉnh theo ngành/brand):

1. TIÊU ĐỀ: Nổi bật, thu hút, gây tò mò hoặc cấp bách
2. MỞ ĐẦU: Giới thiệu vấn đề/thay đổi quan trọng, giải thích tại sao cần quan tâm
3. TÍNH CẤP BÁCH: Nhấn mạnh thời gian, deadline, sự cần thiết hành động ngay
4. CÂU CHUYỆN THỰC TẾ: Ví dụ thực, case study, tình huống đã xảy ra
5. GIẢI PHÁP/DỊCH VỤ: Chi tiết cách brand giúp giải quyết vấn đề
6. LỜI KHUYÊN CHUYÊN GIA: Tips, chiến lược, mẹo thực hành
7. CTA MẠNH MẼ: Rõ ràng, multiple touchpoints (inbox, hotline, đăng ký)
8. HASHTAGS & TỪ KHÓA: Tối ưu theo channel settings
9. THÔNG TIN LIÊN HỆ: Đặt vị trí dễ thấy (nếu brand có footer info)

⚠️ Mỗi phần PHẢI có nội dung thực chất, KHÔNG viết qua loa.
⚠️ Điều chỉnh ví dụ/case study theo ngành của brand (lấy từ Industry Memory nếu có).
```

Section này chỉ inject cho các kênh có `min_length >= 200 words` (Facebook, LinkedIn, Email, Website, YouTube). Kênh ngắn (TikTok, Twitter, Instagram) không áp dụng.

#### 3. Cập nhật `CHANNEL_TRANSFORM_MATRIX` — Tăng `wordCountMultiplier`
**File:** `supabase/functions/_shared/channel-transform-rules.ts`

Khi dùng Core Content flow, tỉ lệ transform cũng cần tăng tương ứng:

| Channel | Hiện tại | Sau thay đổi |
|---------|----------|-------------|
| Facebook | [0.10, 0.25] | **[0.20, 0.40]** |
| LinkedIn | [0.15, 0.30] | **[0.25, 0.45]** |
| Email | [0.10, 0.25] | **[0.20, 0.40]** |

### Tổng file thay đổi
- `supabase/functions/generate-multichannel/index.ts` — 2 chỗ (channel settings + system prompt)
- `supabase/functions/_shared/channel-transform-rules.ts` — 3 chỗ (wordCountMultiplier)

### Tại sao áp dụng được cho MỌI brand?
- Prompt dùng từ generic ("vấn đề", "giải pháp", "case study") — AI tự map vào ngành cụ thể dựa trên Industry Memory + Brand Voice
- Brand thuế → AI viết về thay đổi thuế, deadline quyết toán
- Brand thẩm mỹ → AI viết về xu hướng, trước/sau treatment
- Brand F&B → AI viết về menu mới, feedback khách hàng
- Brand BĐS → AI viết về chính sách, case study giao dịch thành công

