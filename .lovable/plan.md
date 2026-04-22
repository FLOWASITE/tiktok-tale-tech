
# Mở rộng bộ layout social image ngoài các layout hiện tại

## Hiện trạng
Hệ thống hiện đã có các layout:
- `poster`
- `infographic`
- `quote_card`
- `feature_list`
- `contact_card`
- `education_infographic`

Các layout này đã đủ cho nhiều case, nhưng vẫn thiếu một số pattern social rất mạnh cho feed hiện đại, đặc biệt cho:
- before/after hoặc so sánh
- step-by-step / timeline
- product spotlight
- số liệu nổi bật / stat card
- testimonial / social proof
- editorial minimal / magazine cover

## Mục tiêu
Mở rộng thư viện layout để AI có nhiều “khung” phù hợp hơn khi render ảnh social, thay vì chủ yếu xoay quanh poster/infographic/contact-card.

## Bộ layout nên bổ sung

### 1) Comparison Card
Phù hợp:
- before vs after
- sai vs đúng
- cũ vs mới
- lựa chọn A/B

Cấu trúc:
```text
Header
Left block | Right block
Bottom takeaway / CTA
```

Nên dùng cho:
- Facebook, LinkedIn, Instagram feed

### 2) Timeline / Step Flow
Phù hợp:
- quy trình
- 3–5 bước
- hành trình khách hàng
- hướng dẫn từng bước

Cấu trúc:
```text
Banner
Step 1
Step 2
Step 3
Footer / CTA
```

Nên dùng cho:
- educational content, B2B, health/beauty guidance

### 3) Stat Spotlight
Phù hợp:
- một con số lớn
- KPI
- insight/data
- research finding

Cấu trúc:
```text
Small banner
Big hero number
Short explanation
CTA / source line
```

Nên dùng cho:
- LinkedIn, Facebook, industry updates, data-led content

### 4) Product Spotlight
Phù hợp:
- giới thiệu sản phẩm/dịch vụ
- launch
- USP chính
- key benefits

Cấu trúc:
```text
Hero visual center
Headline
2–4 benefit bullets
CTA
```

Nên dùng cho:
- Instagram, Facebook ads, TikTok thumbnail-style visual

### 5) Testimonial / Social Proof
Phù hợp:
- feedback khách hàng
- review nổi bật
- trust building
- case proof

Cấu trúc:
```text
Quote / testimonial
Author / role
Proof chips / badges
CTA or brand line
```

Nên dùng cho:
- Facebook, LinkedIn, clinic/service brands

### 6) Editorial Cover
Phù hợp:
- thought leadership
- trend/opinion
- personal brand
- announcement cao cấp

Cấu trúc:
```text
Large title
Subheading
Minimal accent label
Very clean composition
```

Nên dùng cho:
- LinkedIn, Threads, Instagram high-end brand feed

### 7) Problem → Solution
Phù hợp:
- pain point marketing
- objection handling
- conversion content

Cấu trúc:
```text
Pain statement
Solution block
3 support bullets
CTA
```

Nên dùng cho:
- sales content, educational promotion, lead-gen creatives

### 8) Checklist / Quick Tips
Phù hợp:
- list ngắn
- save-worthy tips
- “5 điều cần nhớ”

Cấu trúc:
```text
Banner
Checklist items with icons/checks
Mini summary
CTA
```

Nên dùng cho:
- Instagram, Facebook, Zalo OA

## Ưu tiên triển khai
Nếu muốn mở rộng nhưng vẫn gọn, nên làm theo 2 phase.

### Phase 1 — High impact
Thêm 4 layout trước:
- `comparison_card`
- `timeline_steps`
- `stat_spotlight`
- `testimonial_card`

Lý do:
- tăng độ phủ use case rõ nhất
- ít trùng với layout hiện có
- rất hợp social image

### Phase 2 — Brand/aesthetic expansion
Thêm tiếp:
- `product_spotlight`
- `editorial_cover`
- `problem_solution`
- `checklist_card`

## Cách implement

### 1) Mở rộng template config
Cập nhật `src/config/overlayTemplates.ts`:
- thêm template mới
- thêm mô tả ngắn, icon, required slots, defaults
- giữ tương thích với hệ layout hiện tại (`stack`, `split`, `banner_cards`, `hero_text`, `simple`) hoặc bổ sung layout enum nếu thật sự cần

### 2) Mở rộng structured overlay schema nếu cần
Rà lại:
- `src/lib/hybridImageGenerator.ts`
- `supabase/functions/_shared/hybrid-image-utils.ts`
- `supabase/functions/generate-brand-image/index.ts`

Để hỗ trợ thêm các slot mới nếu cần, ví dụ:
- `comparison`
- `steps`
- `quoteSource`
- `proofBadges`
- `statLabel`

Nếu chưa muốn tăng schema complexity, có thể map layout mới vào slot cũ:
- comparison dùng `cards`
- stat spotlight dùng `heroText + headline`
- testimonial dùng `heroText + footer`
- timeline dùng `cards` dạng vertical numbered

### 3) Nâng logic AI chọn layout
Trong flow decomposition / auto-select:
- mở rộng `suggestedLayout`
- bổ sung heuristic mapping theo keyword:
  - “so sánh”, “vs”, “before after” → `comparison_card`
  - “bước”, “quy trình”, “step” → `timeline_steps`
  - “%”, “tăng”, “giảm”, “số liệu” → `stat_spotlight`
  - “review”, “khách hàng”, “testimonial” → `testimonial_card`

### 4) Cập nhật UI picker
Cập nhật `OverlayTemplatePicker.tsx`:
- nhóm layout theo mục đích thay vì danh sách phẳng nếu số lượng tăng
- gợi ý label ngắn, dễ hiểu cho user không kỹ thuật

Ví dụ nhóm:
- Chuyển đổi: Poster, Product, Problem/Solution
- Giáo dục: Infographic, Timeline, Checklist
- Niềm tin: Testimonial, Contact
- Cá tính thương hiệu: Editorial, Quote

### 5) Đồng bộ prompt/render contract
Vì flow hiện tại là:
- AI render text chính + layout
- logo canvas
- footer canvas

Nên mỗi layout mới cần định nghĩa rõ:
- phần nào do AI bake
- phần nào luôn để footer canvas xử lý
- vùng safe-zone cho logo

## Mapping đề xuất theo kênh

### Facebook
- poster
- comparison_card
- testimonial_card
- checklist_card

### Instagram
- product_spotlight
- quote_card
- editorial_cover
- stat_spotlight

### LinkedIn
- stat_spotlight
- editorial_cover
- timeline_steps
- infographic

### Zalo OA / Telegram
- contact_card
- checklist_card
- feature_list
- problem_solution

## QA cần làm
- kiểm tra AI auto-select có chọn đúng template theo content type
- kiểm tra layout mới không làm mất logo/footer
- test nội dung dài tiếng Việt để tránh text overflow
- test 3 nhóm nội dung:
  - educational
  - promotional
  - social proof
- test trên ít nhất Facebook / Instagram / LinkedIn

## Kết quả mong muốn
Sau khi mở rộng, hệ thống sẽ có bộ layout social “đúng ngữ cảnh” hơn:
- không chỉ dừng ở poster/infographic cơ bản
- AI chọn layout sát intent nội dung hơn
- ảnh social nhìn đa dạng hơn nhưng vẫn bám pipeline hiện tại: AI layout + logo canvas + footer canvas
