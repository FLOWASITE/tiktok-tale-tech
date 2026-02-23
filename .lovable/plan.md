

# Phat trien Flowa da quoc gia - Phan tich toan dien

## Boi canh

Hien tai Flowa duoc xay dung **gan nhu hoan toan cho thi truong Viet Nam**. Du da co i18n (vi/en/th) cho landing page, phan core cua app - dac biet la **AI content generation** - dang hardcode tieng Viet o moi noi.

Duoi day la tat ca cac van de can xu ly neu muon phat trien o thi truong Thai Lan (hoac bat ky quoc gia nao khac).

---

## 1. AI CONTENT GENERATION - Van de LON NHAT

**Muc do**: CRITICAL

Tat ca cac Edge Function tao noi dung deu hardcode tieng Viet trong system prompt va user prompt:

| Edge Function | Van de |
|---|---|
| `generate-multichannel` | System prompt: "Ban la chuyen gia content marketing tai Viet Nam" |
| `generate-core-content` | Registry prompt: "Ban la chuyen gia viet content marketing hang dau Viet Nam" |
| `generate-carousel` | Prompt: "Viet noi dung tieng Viet hap dan" + text overlay tieng Viet |
| `chat-topics` | Search query: "xu huong noi dung ... Viet Nam tuan nay" |
| `topic-ai` | "Content Strategist ... content marketing tai Viet Nam" |
| `optimize-ad-copy` | System prompt hardcode tieng Viet |
| `generate-storyboard` | "Ban la chuyen gia dao dien video..." |
| `analyze-dashboard-insights` | "Phan tich du lieu ... bang tieng Viet" |
| `kpi-ai` | "Reasoning phai ... bang tieng Viet" |
| `score-ad-creative` | "Strengths/Weaknesses bang tieng Viet" |

**Can xu ly**: Tat ca system prompt phai nhan biet `output_language` tu brand/user va dieu chinh ngon ngu output tuong ung.

---

## 2. SALES CHATBOT va HELP CHATBOT

**Muc do**: HIGH

- `sales-chatbot`: Persona la "Thuy Linh - Tu van vien cua Flowa, nen tang Content Marketing #1 Viet Nam" - hoan toan VN-centric
- `help-chatbot`: Toan bo knowledge base va huong dan bang tieng Viet
- `FLOWA_KNOWLEDGE_BASE`: "Flowa duoc xay dung tai Viet Nam, toi uu cho tieng Viet"

**Can xu ly**: Tao cac phien ban persona + knowledge base theo ngon ngu/quoc gia cua user.

---

## 3. UI DASHBOARD - i18n chua hoan tat

**Muc do**: HIGH

- Landing page (`/`): Da co i18n (vi/en/th) - OK
- **Toan bo dashboard** (sau khi login): Hardcode tieng Viet
  - Toast messages: "Da doi lich", "Nhiem vu moi"
  - Labels, buttons, tooltips
  - Date formatting: `locale: vi` hardcode o 150+ files
  - Sort: `localeCompare('vi')`

**Can xu ly**: Mo rong i18n tu landing page ra toan bo dashboard. Them translation keys cho tat ca cac string hien thi.

---

## 4. TOKEN ESTIMATION va TEXT PROCESSING

**Muc do**: MEDIUM

- `token-manager.ts`: Su dung `vietnamesePattern` va `vietnameseRatio = 2.0` de uoc luong token - **khong dung cho Thai/Trung/Nhat**
- `dynamic-tokens.ts`: Comment "for Vietnamese" khi tinh token
- `normalizeVietnamese()` trong risk-scoring: Chi xu ly dau tieng Viet, khong xu ly ky tu Thai/Nhat/Han

**Can xu ly**: Tao multi-language token estimator va text normalizer (Thai co ky tu dac biet rieng, khong co khoang trang giua cac tu).

---

## 5. COMPLIANCE & RISK SCORING

**Muc do**: HIGH

- `compliance-precheck.ts`: Pattern nhu "so 1", "giam can", "lam giau" - chi phat hien tu cam tieng Viet
- `cross-channel-dedup.ts`: "Local Vietnamese context" hardcode
- `role-channel-adapter.ts`: CTA patterns hardcode tieng Viet: "Ban nghi sao?", "Tag nguoi can biet"

**Can xu ly**: CTA patterns, forbidden term patterns can duoc cau hinh theo quoc gia trong Industry Pack + Jurisdiction Profile (he thong da co san co so ha tang nay).

---

## 6. REGULATION CRAWLING SYSTEM

**Muc do**: MEDIUM (chi can khi mo rong compliance)

- `auto-crawl-regulations`: Sources la cac trang VBPL Viet Nam (vanban.chinhphu.vn, thuvienphapluat.vn)
- `CRITICAL_KEYWORDS_VN`: Chi co tu khoa tieng Viet ("xu phat", "cam", "bat buoc")
- `extract-regulation-content`: `isVietnamese = jurisdiction === 'VN'` - co logic chia nhanh nhung chua co Thai

**Can xu ly**: Them sources cho Thai (thai.gov), keywords Thai, va extraction prompt cho Thai.

---

## 7. INDUSTRY MEMORY DATA

**Muc do**: HIGH

- 463+ industry packs hien tai co translations chu yeu la tieng Viet
- `industry_pack_translations`: Can tao ban dich Thai cho tat ca cac pack
- `industry_jurisdiction_profiles`: Can tao profile cho `TH` voi resolved_rules rieng (luat Thai Lan)
- `migrate-industry-templates.ts`: Hardcode 20+ nganh voi ten/mo ta tieng Viet

**Can xu ly**: Tao jurisdiction profiles TH cho cac industry packs, them translations Thai.

---

## 8. FONT & TEXT OVERLAY

**Muc do**: MEDIUM

- `overlay-text-canvas`: Load Google Font "with Vietnamese support" - can ho tro Thai fonts (co dau thanh rieng)
- Carousel text: "No distorted Vietnamese characters" - can tuong tu cho Thai

**Can xu ly**: Detect ngon ngu va load font phu hop (Sarabun cho Thai, Noto Sans cho da ngon ngu).

---

## 9. PRICING & CURRENCY

**Muc do**: LOW-MEDIUM

- `th.json` da co pricing bang Baht (990 Baht/thang) - OK
- He thong subscription (`plan_limits`, `subscriptions`) chua co truong currency
- Payment gateway: Chua thay tich hop (Stripe? PromptPay cho Thai?)

---

## 10. CHANNEL & SOCIAL PLATFORM DIFFERENCES

**Muc do**: MEDIUM

- Thai co LINE Official thay vi Zalo
- Instagram/TikTok/Facebook la chung - OK
- Twitter/X usage khac nhau giua cac nuoc
- Channel mapping (`SUPPORTED_CHANNELS`) can bo sung LINE

---

## ROADMAP DE XUAT (Thu tu uu tien)

### Phase 1 - Core Infrastructure (Nen tang)
1. Them truong `output_language` vao `brand_templates` (hoac lay tu `country_code`)
2. Tao mapping `country_code -> language_code` (TH -> th, VN -> vi, US -> en)
3. Cap nhat tat ca Edge Functions de nhan `outputLanguage` va dieu chinh prompt

### Phase 2 - AI Generation (Quan trong nhat)
4. Refactor system prompts: tham so hoa ngon ngu thay vi hardcode
5. Cap nhat CTA patterns, forbidden terms theo ngon ngu
6. Cap nhat token estimation cho multi-language

### Phase 3 - Industry Data
7. Tao jurisdiction profiles TH cho cac industry packs pho bien
8. Them translations Thai cho industry packs
9. Them regulation sources Thai (neu can compliance)

### Phase 4 - UI Dashboard i18n
10. Mo rong translation keys ra toan bo dashboard
11. Cap nhat date formatting theo user locale
12. Cap nhat chatbot personas theo ngon ngu

### Phase 5 - Polish
13. Font support cho Thai
14. Them LINE channel
15. Pricing/currency theo quoc gia

---

## Tong ket

| Lop | So luong van de | Muc do |
|---|---|---|
| AI Prompts (Edge Functions) | 10+ functions | CRITICAL |
| UI Dashboard i18n | 150+ files | HIGH |
| Industry Data (translations + profiles) | 463+ packs | HIGH |
| Compliance & Risk Scoring | 3-4 modules | HIGH |
| Token/Text Processing | 2-3 modules | MEDIUM |
| Regulations Crawling | 2 functions | MEDIUM |
| Font & Overlay | 1-2 modules | MEDIUM |
| Channels (LINE) | Config + UI | MEDIUM |
| Pricing/Currency | DB + UI | LOW |

Uoc tinh: **Phase 1+2 (Core + AI)** la quan trong nhat va nen lam truoc. Co the hoan thanh trong **2-3 sprint**. Phase 3-5 co the lam song song hoac sau.

